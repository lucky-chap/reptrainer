"""FastAPI WebSocket server for Reptrainer live roleplay sessions.

Refactored to follow the bidi-agent architecture while maintaining unique features.
"""

import asyncio
import base64
import json
import logging
from pathlib import Path

import google.genai.errors
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from starlette.websockets import WebSocketState
from fastapi.middleware.cors import CORSMiddleware
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.genai import types

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Import agent and runner
from persona_agent.agent import runner, session_service, APP_NAME, agent
from auth import verify_api_key
from config import settings
from firestore_client import get_knowledge_metadata

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Reptrainer Live Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "reptrainer-live-agent"}

@app.websocket("/ws/{session_id}")
async def live_session(
    websocket: WebSocket,
    session_id: str,
    api_key: str = Query(None, alias="apiKey"),
    voice_name: str = Query("Kore", alias="voiceName"),
    team_id: str = Query(None, alias="teamId"),
    user_id: str = Query("anonymous", alias="userId"),
    has_greeted: bool = Query(False, alias="hasGreeted"),
    proactivity: bool = False,
    affective_dialog: bool = False,
):
    """Bidirectional WebSocket endpoint for live roleplay sessions."""
    logger.info("Incoming connection request: session=%s user=%s team=%s", session_id, user_id, team_id)

    # ── Auth ──────────────────────────────────────────────────────────────
    if not verify_api_key(api_key):
        logger.warning("Auth failed: invalid API key provided for session=%s", session_id)
        # We accept then close with a 4xxx code for better client-side diagnostics
        await websocket.accept()
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    logger.info("Client connected and authenticated: session=%s", session_id)

    # ── Wait for setup message ────────────────────────────────────────────
    try:
        setup_raw = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        setup = json.loads(setup_raw)
        if setup.get("type") != "setup":
            await websocket.close(code=4003, reason="Expected setup message")
            return
    except (asyncio.TimeoutError, json.JSONDecodeError) as e:
        logger.error("Setup failed: %s", e)
        await websocket.close(code=4003, reason="Setup timeout or invalid JSON")
        return

    system_prompt = setup.get("systemPrompt", "")
    voice_name = setup.get("voiceName", voice_name)

    # ── Load knowledge metadata from Firestore ────────────────────────────
    knowledge_metadata = None
    if team_id:
        try:
            knowledge_metadata = await get_knowledge_metadata(team_id)
        except Exception as e:
            logger.warning("Failed to load knowledge metadata: %s", e)

    # ── Per-session event queue for background events (analysis, etc) ─────
    event_queue: asyncio.Queue = asyncio.Queue()

    # ── Get or create ADK session ─────────────────────────────────────────
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if session is None:
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
            state={
                "system_prompt": system_prompt,
                "knowledge_metadata": knowledge_metadata,
                "search_count": 0,
                "event_queue": event_queue,
                "has_greeted": has_greeted,
                "session_ended": False,
            },
        )
    else:
        session.state["event_queue"] = event_queue
        session.state["system_prompt"] = system_prompt
        if knowledge_metadata:
            session.state["knowledge_metadata"] = knowledge_metadata

    # ── Build RunConfig (Modality Detection Pattern) ──────────────────────
    model_name = agent.model
    is_native_audio = "native-audio" in model_name.lower() or "live" in model_name.lower()

    realtime_input_config = types.RealtimeInputConfig(
        automatic_activity_detection=types.AutomaticActivityDetection(disabled=True)
    )

    if is_native_audio:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
                )
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            session_resumption=types.SessionResumptionConfig(),
            realtime_input_config=realtime_input_config,
            proactivity=types.ProactivityConfig(proactive_audio=True) if proactivity else None,
            enable_affective_dialog=affective_dialog if affective_dialog else None,
        )
    else:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["TEXT"],
            session_resumption=types.SessionResumptionConfig(),
            realtime_input_config=realtime_input_config,
        )

    # ── Create LiveRequestQueue ───────────────────────────────────────────
    live_request_queue = LiveRequestQueue()
    ready_event = asyncio.Event()

    await websocket.send_json({"type": "connected"})

    # ── Upstream: Client → LiveRequestQueue (Bidi Pattern) ────────────────
    async def upstream():
        vad_active = False
        try:
            await ready_event.wait()
            while True:
                msg = await websocket.receive()
                if "bytes" in msg:
                    audio_data = msg["bytes"]
                    # logger.debug("Received audio: %d bytes", len(audio_data)) # Very noisy
                    live_request_queue.send_realtime(
                        types.Blob(mime_type="audio/pcm;rate=16000", data=audio_data)
                    )
                elif "text" in msg:
                    data = json.loads(msg["text"])
                    msg_type = data.get("type")
                    event_type = data.get("event") # VAD signals use 'event'

                    if msg_type == "text":
                        logger.info("Received text from client: %s", data.get("text"))
                        live_request_queue.send_content(
                            types.Content(role="user", parts=[types.Part(text=data.get("text", ""))])
                        )
                    elif event_type in ["activity_start", "activity_end"]:
                        logger.info("Received VAD signal: %s", event_type)
                        if event_type == "activity_start" and not vad_active:
                            vad_active = True
                            live_request_queue.send_activity_start()
                        elif event_type == "activity_end" and vad_active:
                            vad_active = False
                            live_request_queue.send_activity_end()
                    else:
                        logger.debug("Received unknown text message: %s", data)
        except WebSocketDisconnect:
            pass
        finally:
            live_request_queue.close()

    async def safe_send_bytes(data: bytes):
        if websocket.application_state == WebSocketState.DISCONNECTED:
            return
        try:
            await websocket.send_bytes(data)
        except RuntimeError:
            # Close was already sent
            return

    async def safe_send_json(payload: dict):
        if websocket.application_state == WebSocketState.DISCONNECTED:
            return
        try:
            await websocket.send_json(payload)
        except RuntimeError:
            return

    # ── Downstream: ADK Events → Client (Bidi Pattern + Unique Features) ──
    async def downstream():
        try:
            ready_event.set()
            # AI Initiation
            if not session.state.get("has_greeted", False):
                session.state["has_greeted"] = True
                live_request_queue.send_content(
                    types.Content(role="user", parts=[types.Part(text="Please introduce yourself and start the roleplay.")])
                )

            async for event in runner.run_live(
                user_id=user_id,
                session_id=session_id,
                live_request_queue=live_request_queue,
                run_config=run_config,
            ):
                if websocket.application_state != WebSocketState.CONNECTED:
                    break
                # ── Binary Audio Relay ──
                if event.content and event.content.parts:
                    text_parts = []
                    for part in event.content.parts:
                        if part.inline_data and part.inline_data.data:
                            raw = part.inline_data.data
                            if isinstance(raw, str):
                                raw = base64.b64decode(raw)
                            await safe_send_bytes(raw)
                        elif part.text:
                            text_parts.append(part.text)

                    if text_parts and not event.output_transcription:
                        await safe_send_json(
                            {
                                "type": "transcript",
                                "role": "model",
                                "text": "".join(text_parts),
                                "finished": bool(event.turn_complete),
                            }
                        )

                # ── Transcription Relay ──
                if event.input_transcription and event.input_transcription.text:
                    await safe_send_json(
                        {
                            "type": "transcript",
                            "role": "user",
                            "text": event.input_transcription.text,
                            "finished": bool(event.input_transcription.finished),
                        }
                    )

                if event.output_transcription and event.output_transcription.text:
                    await safe_send_json(
                        {
                            "type": "transcript",
                            "role": "model",
                            "text": event.output_transcription.text,
                            "finished": bool(event.output_transcription.finished),
                        }
                    )

                # ── Control signals ──
                if event.turn_complete:
                    await safe_send_json({"type": "turn_complete"})
                elif event.interrupted:
                    await safe_send_json({"type": "interrupted"})

        except google.genai.errors.APIError as e:
            logger.info("Gemini session closed: %s", e)
        except Exception as e:
            logger.error("Downstream error: %s", e, exc_info=True)

    # ── Tool Event Relay: background events → client ──────────────────────
    async def tool_event_relay():
        try:
            while True:
                evt = await event_queue.get()
                await safe_send_json(evt)
                if evt.get("name") == "end_roleplay":
                    break
        except asyncio.CancelledError:
            pass

    # ── Run tasks concurrently ────────────────────────────────────────────
    try:
        await asyncio.gather(upstream(), downstream(), tool_event_relay())
    except WebSocketDisconnect:
        logger.info("Session ended: session=%s", session_id)
    finally:
        live_request_queue.close()
        try:
            await websocket.close(code=1000)
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True, workers=1)
