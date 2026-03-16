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
from analysis import run_analysis
from auth import verify_api_key
from config import settings
# from firestore_client import get_knowledge_metadata

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

    voice_name = setup.get("voiceName", voice_name)

    # ── Parse persona data from setup (Python PersonaEngine builds the prompt) ─
    persona_data = setup.get("persona")
    metadata_data = setup.get("metadata")
    scenario_data = setup.get("scenario")
    setup_user_name = setup.get("userName")
    setup_company_name = setup.get("companyName")

    # Backwards compat: if frontend sends pre-built systemPrompt instead of persona
    system_prompt = setup.get("systemPrompt", "")

    logger.info(
        "Setup received: persona=%s, metadata=%s, systemPrompt=%s chars",
        bool(persona_data),
        bool(metadata_data),
        len(system_prompt),
    )

    # ── Per-session event queue for background events (analysis, etc) ─────
    event_queue: asyncio.Queue = asyncio.Queue()

    # ── Get or create ADK session ─────────────────────────────────────────
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if session is None:
        logger.info("Creating NEW session for session_id=%s", session_id)
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
            state={
                "persona": persona_data,
                "metadata": metadata_data,
                "scenario": scenario_data,
                "user_name": setup_user_name,
                "company_name": setup_company_name,
                "system_prompt": system_prompt,
                "search_count": 0,
                "event_queue": event_queue,
                "has_greeted": has_greeted,
                "session_ended": False,
            },
        )
    else:
        logger.info("Reusing EXISTING session for session_id=%s. Updating state.", session_id)
        session.state["event_queue"] = event_queue
        if persona_data:
            session.state["persona"] = persona_data
            session.state["metadata"] = metadata_data
            session.state["scenario"] = scenario_data
            session.state["user_name"] = setup_user_name
            session.state["company_name"] = setup_company_name
        elif system_prompt:
            session.state["system_prompt"] = system_prompt

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
            input_audio_transcription=types.AudioTranscriptionConfig(language_codes=["en"]),
            output_audio_transcription=types.AudioTranscriptionConfig(language_codes=["en"]),
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
                        # Mark as greeted if user sends text
                        session.state["has_greeted"] = True
                        live_request_queue.send_content(
                            types.Content(role="user", parts=[types.Part(text=data.get("text", ""))])
                        )
                    elif event_type in ["activity_start", "activity_end"]:
                        logger.info("Received VAD signal: %s", event_type)
                        # User is speaking, mark as greeted to suppress AI-initiation if it hasn't happened
                        if event_type == "activity_start":
                            session.state["has_greeted"] = True
                        
                        if event_type == "activity_start" and not vad_active:
                            vad_active = True
                            live_request_queue.send_activity_start()
                        elif event_type == "activity_end" and vad_active:
                            vad_active = False
                            live_request_queue.send_activity_end()
                    else:
                        logger.debug("Received unknown text message: %s", data)
        except (WebSocketDisconnect, RuntimeError):
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
            msg_type = payload.get("type", "unknown")
            logger.info("Sending message to client: type=%s", msg_type)
            if msg_type == "tool_call":
                logger.info("Tool call payload: %s", json.dumps(payload, indent=2))
            await websocket.send_json(payload)
        except RuntimeError:
            return
        except Exception as e:
            logger.error("Error in safe_send_json: %s", e)

    # ── Downstream: ADK Events → Client (Bidi Pattern + Unique Features) ──
    async def downstream():
        # Transcript lines for background analysis
        transcript_lines: list[str] = []
        previous_objections: list[str] = []
        last_user_text = ""
        last_model_text = ""
        analysis_task: asyncio.Task | None = None

        try:
            model_has_spoken = False

            async for event in runner.run_live(
                user_id=user_id,
                session_id=session_id,
                live_request_queue=live_request_queue,
                run_config=run_config,
            ):
                if websocket.application_state != WebSocketState.CONNECTED:
                    break

                # ── Track whether the model has started speaking on its own ──
                if not model_has_spoken and event.content and event.content.parts:
                    if any(
                        (p.inline_data and p.inline_data.data) or p.text
                        for p in event.content.parts
                    ):
                        model_has_spoken = True
                        session.state["has_greeted"] = True

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

                    if text_parts:
                        # For native audio (Live), output_transcription is the source of truth for model text.
                        # We only fallback to event.content text if output_transcription is NOT used (text-only)
                        # or if we are NOT in native audio mode.
                        if not is_native_audio:
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
                    if event.input_transcription.finished:
                        last_user_text = event.input_transcription.text

                if event.output_transcription and event.output_transcription.text:
                    await safe_send_json(
                        {
                            "type": "transcript",
                            "role": "model",
                            "text": event.output_transcription.text,
                            "finished": bool(event.output_transcription.finished),
                        }
                    )
                    if event.output_transcription.finished:
                        last_model_text = event.output_transcription.text

                # ── Control signals ──
                if event.turn_complete:
                    await safe_send_json({"type": "turn_complete"})

                    # ── Background analysis after model turn ──
                    if last_user_text:
                        transcript_lines.append(f"Rep: {last_user_text}")
                        last_user_text = ""
                    if last_model_text:
                        transcript_lines.append(f"Buyer: {last_model_text}")
                        last_model_text = ""

                    if len(transcript_lines) >= 2:
                        # Fire-and-forget: run analysis without blocking audio.
                        # run_analysis appends to previous_objections in-place
                        # and pushes events to event_queue.
                        if analysis_task and not analysis_task.done():
                            analysis_task.cancel()
                        analysis_task = asyncio.create_task(
                            run_analysis(
                                list(transcript_lines),
                                previous_objections,
                                event_queue,
                            )
                        )

                    # Note: do NOT break here on session_ended — let the downstream
                    # continue so the client receives the end_roleplay event via
                    # tool_event_relay and can show the "persona left" UI before
                    # disconnecting.  The loop ends when the client closes the WS.

                elif event.interrupted:
                    await safe_send_json({"type": "interrupted"})

        except google.genai.errors.APIError as e:
            logger.info("Gemini session closed: %s", e)
        except Exception as e:
            logger.error("Downstream error: %s", e, exc_info=True)

    # ── Tool Event Relay: background events → client ──────────────────────
    async def tool_event_relay():
        logger.info("Starting tool_event_relay for session=%s", session_id)
        try:
            while True:
                evt = await event_queue.get()
                logger.info("Relaying tool event from queue: type=%s name=%s", evt.get("type"), evt.get("name"))
                await safe_send_json(evt)
                if evt.get("name") == "end_roleplay":
                    logger.info("end_roleplay event received, stopping relay")
                    break
        except asyncio.CancelledError:
            logger.info("tool_event_relay cancelled")
            pass
        except Exception as e:
            logger.error("Error in tool_event_relay: %s", e, exc_info=True)

    # ── Deferred AI Initiation ──────────────────────────────────────────
    # Wait for the live session to establish, then nudge the model to greet
    # ONLY if it hasn't already started speaking on its own and the user
    # hasn't spoken either.
    needs_initiation = (
        not session.state.get("has_greeted", False) and not proactivity
    )

    async def deferred_initiation():
        """Wait, then send initiation prompt if the model hasn't spoken yet."""
        if not needs_initiation:
            return
        # Give the model time to start speaking on its own
        await asyncio.sleep(2.0)
        # Check if model already spoke or user already spoke
        if session.state.get("has_greeted", False):
            logger.info("Skipping initiation — user or model already greeted (session=%s)", session_id)
            return
        logger.info("Triggering AI initiation for session=%s", session_id)
        session.state["has_greeted"] = True
        live_request_queue.send_content(
            types.Content(
                role="user",
                parts=[types.Part(text="Please introduce yourself and start the roleplay.")],
            )
        )

    # ── Run tasks concurrently ────────────────────────────────────────────
    ready_event.set()
    try:
        await asyncio.gather(upstream(), downstream(), tool_event_relay(), deferred_initiation())
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
