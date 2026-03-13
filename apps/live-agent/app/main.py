"""FastAPI WebSocket server for Reptrainer live roleplay sessions.

Refactored to follow the bidi-agent architecture while maintaining unique features.
"""

import asyncio
import json
import logging
from pathlib import Path

import google.genai.errors
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.genai import types

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Import agent and runner
from persona_agent.agent import runner, session_service, APP_NAME, agent
from analysis import run_analysis
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
    # ── Auth ──────────────────────────────────────────────────────────────
    if not verify_api_key(api_key):
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    logger.info("Client connected: session=%s user=%s team=%s", session_id, user_id, team_id)

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
            proactivity=types.ProactivityConfig(proactive_audio=True) if proactivity else None,
            enable_affective_dialog=affective_dialog if affective_dialog else None,
        )
    else:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["TEXT"],
            session_resumption=types.SessionResumptionConfig(),
        )

    # ── Create LiveRequestQueue ───────────────────────────────────────────
    live_request_queue = LiveRequestQueue()
    ready_event = asyncio.Event()

    await websocket.send_json({"type": "connected"})

    # ── Upstream: Client → LiveRequestQueue (Bidi Pattern) ────────────────
    async def upstream():
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
                        # Gemini Live handles VAD internally, but we log the client signal
                    else:
                        logger.debug("Received unknown text message: %s", data)
        except WebSocketDisconnect:
            pass
        finally:
            live_request_queue.close()

    # ── Downstream: ADK Events → Client (Bidi Pattern + Unique Features) ──
    async def downstream():
        transcript_lines: list[str] = []
        current_user_text = ""
        current_model_text = ""
        analysis_task: asyncio.Task | None = None

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
                # ── Binary Audio Relay (Frontend expects raw bytes for 24kHz audio) ──
                server_content = getattr(event, "server_content", None)
                if server_content:
                    model_turn = getattr(server_content, "model_turn", None)
                    if model_turn:
                        for part in (model_turn.parts or []):
                            inline_data = getattr(part, "inline_data", None)
                            if inline_data and getattr(inline_data, "data", None):
                                await websocket.send_bytes(inline_data.data)

                # ── Bidi-Agent Style: Dump raw event with injected type ─────
                event_dict = event.model_dump(exclude_none=True, by_alias=True)
                
                # Inject 'type' field for frontend compatibility
                if getattr(event, "turn_complete", False):
                    event_dict["type"] = "turn_complete"
                elif getattr(event, "server_content", None) and getattr(event.server_content, "interrupted", False):
                    event_dict["type"] = "interrupted"
                elif getattr(event, "input_transcription", None) is not None:
                    event_dict["type"] = "input_transcription"
                    tx = event.input_transcription
                    event_dict["text"] = tx.text
                    event_dict["isFinal"] = tx.finished
                elif getattr(event, "output_transcription", None) is not None:
                    event_dict["type"] = "output_transcription"
                    tx = event.output_transcription
                    event_dict["text"] = tx.text
                    event_dict["isFinal"] = tx.finished
                elif getattr(event, "server_content", None) and getattr(event.server_content, "model_turn", None):
                    event_dict["type"] = "server_content"
                else:
                    event_dict["type"] = "unknown"

                await websocket.send_json(event_dict)

                # ── Unique Feature: Accumulate transcript for analysis ────
                input_tx = getattr(event, "input_transcription", None)
                if input_tx and input_tx.text:
                    if input_tx.finished:
                        current_user_text = input_tx.text

                output_tx = getattr(event, "output_transcription", None)
                if output_tx and output_tx.text:
                    if output_tx.finished:
                        current_model_text = output_tx.text

                if getattr(event, "turn_complete", False):
                    if current_user_text:
                        transcript_lines.append(f"User: {current_user_text}")
                        current_user_text = ""
                    if current_model_text:
                        transcript_lines.append(f"Persona: {current_model_text}")
                        current_model_text = ""

                    # Background analysis
                    if len(transcript_lines) >= 2:
                        if analysis_task and not analysis_task.done():
                            analysis_task.cancel()
                        analysis_task = asyncio.create_task(
                            run_analysis(list(transcript_lines), [], event_queue)
                        )
        except google.genai.errors.APIError as e:
            logger.info("Gemini session closed: %s", e)
        except Exception as e:
            logger.error("Downstream error: %s", e, exc_info=True)

    # ── Tool Event Relay: background events → client ──────────────────────
    async def tool_event_relay():
        try:
            while True:
                evt = await event_queue.get()
                await websocket.send_json(evt)
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
