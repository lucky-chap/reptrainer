"""FastAPI WebSocket server for Reptrainer live roleplay sessions.

This service bridges the browser client with Google's Gemini Live API
using the ADK Runner.run_live() bidirectional streaming pattern.

Architecture:
  Browser ←→ WebSocket ←→ FastAPI ←→ ADK Runner.run_live() ←→ Gemini Live API

Audio flows as binary PCM frames (no base64 JSON overhead).
Tool call events are relayed to the client via a per-session asyncio.Queue.
"""

import asyncio
import json
import logging

import google.genai.errors
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.genai import types

from agent import runner, session_service, APP_NAME
from auth import verify_api_key
from config import settings
from firestore_client import get_knowledge_metadata

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
    api_key: str = Query(None),
    voice_name: str = Query("Kore"),
    team_id: str = Query(None),
    user_id: str = Query("anonymous"),
    has_greeted: bool = Query(False),
):
    """Bidirectional WebSocket endpoint for live roleplay sessions.

    Protocol:
      1. Client connects with query params (api_key, voice_name, team_id, etc.)
      2. Client sends JSON setup message: {type: "setup", systemPrompt, voiceName}
      3. Bidirectional streaming begins:
         - Client → Server: binary PCM frames (16kHz mono) or JSON control messages
         - Server → Client: binary PCM frames (24kHz mono) or JSON events
      4. On disconnect, LiveRequestQueue is closed (CRITICAL for quota management)
    """
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

    # ── Per-session event queue for tool events → client ──────────────────
    event_queue: asyncio.Queue = asyncio.Queue()

    # ── Get or create ADK session ─────────────────────────────────────────
    # Idempotent: reconnecting with the same session_id reuses existing state
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
        # Reconnect: update the event queue reference and knowledge metadata
        session.state["event_queue"] = event_queue
        if knowledge_metadata:
            session.state["knowledge_metadata"] = knowledge_metadata

    # ── Build RunConfig ───────────────────────────────────────────────────
    run_config = RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice_name
                )
            )
        ),
        # Client-side VAD: disable server-side automatic activity detection
        realtime_input_config=types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(
                disabled=True
            )
        ),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )

    # ── Create LiveRequestQueue (MUST be inside async context) ────────────
    live_request_queue = LiveRequestQueue()
    ready_event = asyncio.Event()

    # Create an alias for Modality to ensure we use the one ADK expects if different
    # But for now, let's try passing it as a string to see if it clears the warning
    # and use gemini-2.0-flash-exp if 2.5 is failing (but keeping 2.5 as it's the user's config)

    # Notify client that the session is ready
    await websocket.send_json({"type": "connected"})

    # ── Upstream: Client audio/control → LiveRequestQueue ─────────────────
    async def upstream():
        try:
            # WAIT until the downstream (Gemini) is actually running
            await ready_event.wait()
            logger.info("Upstream audio flow started: session=%s", session_id)

            while True:
                msg = await websocket.receive()

                if "bytes" in msg and msg["bytes"]:
                    data = msg["bytes"]
                    # Binary PCM frame from AudioWorklet (16kHz mono)
                    live_request_queue.send_realtime(
                        types.Blob(
                            mime_type="audio/pcm;rate=16000",
                            data=data,
                        )
                    )

                elif "text" in msg and msg["text"]:
                    data = json.loads(msg["text"])
                    msg_type = data.get("type")

                    if msg_type == "vad":
                        event = data.get("event")
                        if event == "activity_start":
                            logger.debug("VAD activity_start: session=%s", session_id)
                            live_request_queue.send_activity_start()
                        elif event == "activity_end":
                            logger.debug("VAD activity_end: session=%s", session_id)
                            live_request_queue.send_activity_end()

                    elif msg_type == "text":
                        # Text input from client
                        content = types.Content(
                            role="user",
                            parts=[types.Part(text=data.get("text", ""))],
                        )
                        live_request_queue.send_content(content)

                    elif msg_type == "log_insight":
                        # System command to trigger insight logging
                        content = types.Content(
                            role="user",
                            parts=[types.Part(text=data.get("text", ""))],
                        )
                        live_request_queue.send_content(content)

        except WebSocketDisconnect:
            logger.info("Client disconnected (upstream): session=%s", session_id)
        except Exception as e:
            logger.error("Upstream error session=%s: %s", session_id, e)
        finally:
            live_request_queue.close()

    # ── Downstream: ADK events → Client WebSocket ─────────────────────────
    async def downstream():
        try:
            # Trigger the generator
            live_stream = runner.run_live(
                user_id=user_id,
                session_id=session_id,
                live_request_queue=live_request_queue,
                run_config=run_config,
            )

            # Signal that we are ready to receive audio
            ready_event.set()
            logger.info("Downstream (Gemini) ready: session=%s", session_id)

            # AI Initiation: Trigger the first greeting
            logger.info("Triggering AI initiation: session=%s", session_id)
            live_request_queue.send_content(
                types.Content(
                    role="user",
                    parts=[types.Part(text="Please introduce yourself and start the roleplay.")],
                )
            )

            async for event in live_stream:
                logger.debug("Received event from Gemini: session=%s type=%s", session_id, type(event))

                # ── 1. Process Transcriptions First ───────────────────────────
                # This ensures last piece of text reaches the client before turn_complete signals

                # Input transcription (user speech → text)
                input_tx = getattr(event, "input_transcription", None)
                if input_tx and input_tx.text:
                    logger.debug("Input transcription: %s (final=%s)", input_tx.text, getattr(input_tx, "is_final", False))
                    await websocket.send_json({
                        "type": "input_transcription",
                        "text": input_tx.text,
                        "isFinal": getattr(input_tx, "is_final", False),
                    })

                # Output transcription (model speech → text)
                output_tx = getattr(event, "output_transcription", None)
                if output_tx and output_tx.text:
                    logger.debug("Output transcription: %s (final=%s)", output_tx.text, getattr(output_tx, "is_final", False))
                    await websocket.send_json({
                        "type": "output_transcription",
                        "text": output_tx.text,
                        "isFinal": getattr(output_tx, "is_final", False),
                    })

                # ── 2. Process Content (Audio/Text) ───────────────────────────

                # Audio content
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.inline_data and part.inline_data.data:
                            # Send audio as binary WebSocket frame
                            await websocket.send_bytes(part.inline_data.data)
                        elif part.text:
                            # If we get text parts, they might be redundant with transcriptions,
                            # but we keep them as a fallback if no model_transcription event is present.
                            logger.debug("Received text part fallback: %s", part.text)

                # ── 3. Process Control Signals Last ───────────────────────────

                # Turn complete
                if getattr(event, "turn_complete", False):
                    await websocket.send_json({"type": "turn_complete"})

                # Interrupted by user
                if getattr(event, "interrupted", False):
                    await websocket.send_json({"type": "interrupted"})

        except google.genai.errors.APIError as e:
            if "1000" in str(e):
                logger.info("Gemini session closed gracefully (1000): session=%s", session_id)
            else:
                logger.error("Gemini API error session=%s: %s", session_id, e)
        except WebSocketDisconnect:
            logger.info("Client disconnected (downstream): session=%s", session_id)
        except Exception as e:
            logger.error("Downstream error session=%s: %s", session_id, e, exc_info=True)
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
            except Exception:
                pass

    # ── Tool Event Relay: tool events → client ────────────────────────────
    async def tool_event_relay():
        try:
            while True:
                evt = await event_queue.get()
                try:
                    await websocket.send_json(evt)
                except Exception:
                    break  # WebSocket closed

                # If end_roleplay was called, stop relay
                if evt.get("name") == "end_roleplay":
                    break
        except Exception as e:
            logger.error("Tool event relay error: %s", e)

    # ── Run all three tasks concurrently ──────────────────────────────────
    t_up = asyncio.create_task(upstream(), name="upstream")
    t_down = asyncio.create_task(downstream(), name="downstream")
    t_relay = asyncio.create_task(tool_event_relay(), name="tool_relay")

    try:
        # Wait for any task to finish (e.g. disconnect or error)
        done, pending = await asyncio.wait(
            [t_up, t_down, t_relay],
            return_when=asyncio.FIRST_COMPLETED
        )
    except Exception as e:
        logger.error("Session error: %s", e, exc_info=True)
    finally:
        # Clean up all tasks
        for t in [t_up, t_down, t_relay]:
            if not t.done():
                t.cancel()
        
        # Give them a moment to cancel
        if [t for t in [t_up, t_down, t_relay] if not t.done()]:
             await asyncio.gather(t_up, t_down, t_relay, return_exceptions=True)

        # Belt-and-suspenders: always close the queue
        live_request_queue.close()
        logger.info("Session ended: session=%s", session_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
        workers=1,  # Single worker — event_queue is in-process memory
    )
