# Reptrainer: Production-Grade ADK Upgrade Plan

## Context

The current Gemini Live integration uses `functionsExportedForTestingOnly.handleFunctionCallList` from `@google/adk` — an unstable internal testing API. It creates ephemeral `LlmAgent + InvocationContext` instances on every tool call. Additionally, the frontend uses the deprecated `ScriptProcessorNode` for audio capture, wastes ~33% bandwidth on base64 JSON, and generates post-session debriefs in a fire-and-forget IIFE that can be lost on tab close. Two Firestore collections (`sessions` + `callSessions`) write redundant data.

**Goal:** Replace the TypeScript Gemini Live proxy with a proper Python FastAPI + ADK service using `Runner.run_live()` + `LiveRequestQueue`. Overhaul frontend audio to use `AudioWorklet`. Fix debrief reliability. Consolidate to a single Firestore collection.

---

## What Changes vs. What Stays

| Layer                                          | Changes                                       | Stays                                  |
| ---------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| `apps/live-agent/` (NEW)                       | Python ADK WebSocket service                  | —                                      |
| `apps/api/src/routes/live.ts`                  | Deleted (replaced by Python service)          | —                                      |
| `apps/api/src/services/gemini-live.ts`         | Deleted                                       | —                                      |
| `apps/api/src/services/adk-streaming-utils.ts` | Deleted (unused)                              | —                                      |
| `apps/api/src/routes/session.ts`               | Add `/debrief-async` endpoint                 | Rest unchanged                         |
| `apps/api/src/services/*.ts`                   | Add `firestore-admin.ts`                      | vertex.ts, feedback.ts, rag.ts, tts.ts |
| `apps/web/hooks/use-gemini-live.ts`            | Full internal rewrite (same public interface) | —                                      |
| `apps/web/public/worklets/` (NEW)              | 3 AudioWorklet processor files                | —                                      |
| `apps/web/components/roleplay-session.tsx`     | Remove IIFE debrief, remove dual writes       | Stage flow, handleEndCall structure    |
| `apps/web/lib/db/sessions.ts`                  | Redirect `sessions` → `callSessions`          | `callSessions` CRUD                    |
| `packages/shared/src/types.ts`                 | Add `debriefStatus` to `CallSession`          | All other types                        |
| `docker-compose.yml`                           | Add `live-agent` service                      | Existing services                      |

---

## Part 1: Python ADK Live Service (`apps/live-agent/`)

### Directory Structure

```
apps/live-agent/
├── Dockerfile
├── pyproject.toml
├── .env.example
├── main.py              # FastAPI WebSocket /ws/{session_id}
├── agent.py             # ADK LlmAgent + Runner + VertexAiSessionService (singletons)
├── config.py            # Pydantic settings
├── auth.py              # API_SECRET_KEY check
├── firestore_client.py  # Firebase Admin reads (KnowledgeMetadata)
├── vertex_search.py     # researchCompetitor logic (mirrors TS vertex.ts)
└── tools/
    ├── __init__.py
    ├── research_competitor.py
    ├── log_sales_insight.py
    ├── log_objection.py
    ├── update_persona_mood.py
    └── end_roleplay.py
```

### Key Pattern: `agent.py` (Singletons, built once at startup)

```python
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import VertexAiSessionService
from tools import research_competitor, log_sales_insight, log_objection, update_persona_mood, end_roleplay

session_service = VertexAiSessionService(
    project=settings.GOOGLE_CLOUD_PROJECT,
    location=settings.GOOGLE_CLOUD_LOCATION
)

agent = LlmAgent(
    name="persona_agent",
    model="gemini-live-2.5-flash-native-audio",
    tools=[research_competitor, log_sales_insight, log_objection, update_persona_mood, end_roleplay],
    # Callable reads per-session system prompt from session state
    instruction=lambda ctx: ctx.session.state.get("system_prompt", ""),
)

runner = Runner(app_name="reptrainer", agent=agent, session_service=session_service)
```

### Key Pattern: `main.py` WebSocket Endpoint

```python
@app.websocket("/ws/{session_id}")
async def live_session(websocket: WebSocket, session_id: str, api_key: str = Query(...), ...):
    if api_key != settings.API_SECRET_KEY:
        await websocket.close(code=4001); return

    await websocket.accept()

    # 1. Receive setup message (systemPrompt, voiceName, ragCorpusId)
    setup = await websocket.receive_json()   # {type: "setup", systemPrompt, voiceName}

    # 2. Per-session queue for tool events → client
    event_queue: asyncio.Queue = asyncio.Queue()

    # 3. Get/create ADK session (idempotent — reconnects reuse same state)
    session = await session_service.get_or_create_session(
        app_name="reptrainer", user_id=user_id, session_id=session_id,
        state={"system_prompt": setup["systemPrompt"], "event_queue": event_queue,
               "knowledge_metadata": await get_knowledge_metadata(team_id),
               "search_count": 0, "has_greeted": has_greeted},
    )

    run_config = RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        speech_config=SpeechConfig(voice_config=VoiceConfig(
            prebuilt_voice_config=PrebuiltVoiceConfig(voice_name=setup["voiceName"]))),
        realtime_input_config=RealtimeInputConfig(   # Client-side VAD
            automatic_activity_detection=AutomaticActivityDetection(disabled=True)),
        input_audio_transcription={},
        output_audio_transcription={},
        session_resumption=True,
    )

    live_request_queue = LiveRequestQueue()   # MUST create inside async context
    await websocket.send_json({"type": "connected"})

    async def upstream():
        try:
            while True:
                msg = await websocket.receive()
                if "bytes" in msg:   # Binary PCM from AudioWorklet (16kHz)
                    live_request_queue.send_realtime(Blob(mime_type="audio/pcm;rate=16000", data=msg["bytes"]))
                elif "text" in msg:
                    data = json.loads(msg["text"])
                    if data["type"] == "vad":
                        if data["event"] == "activity_start": live_request_queue.send_activity_start()
                        else: live_request_queue.send_activity_end()
        except WebSocketDisconnect:
            pass
        finally:
            live_request_queue.close()   # CRITICAL — always close or sessions leak quota

    async def downstream():
        async for event in runner.run_live(user_id, session_id, live_request_queue, run_config):
            if event.content:
                for part in event.content.parts:
                    if part.inline_data:   # Audio: send as binary frame
                        await websocket.send_bytes(part.inline_data.data)
                    elif part.text:
                        await websocket.send_json({"type": "output_transcription", "text": part.text, "isFinal": event.is_final})
            if event.is_final: await websocket.send_json({"type": "turn_complete"})
            if event.interrupted: await websocket.send_json({"type": "interrupted"})
            if event.input_transcription:
                await websocket.send_json({"type": "input_transcription",
                    "text": event.input_transcription.text, "isFinal": event.input_transcription.is_final})

    async def tool_event_relay():   # Tool events (log_insight, etc.) → client
        while True:
            evt = await event_queue.get()
            await websocket.send_json(evt)

    try:
        await asyncio.gather(upstream(), downstream(), tool_event_relay())
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        live_request_queue.close()   # Belt-and-suspenders
```

### Key Pattern: Tools with ToolContext (ADK handles dispatch automatically)

```python
# tools/log_sales_insight.py
async def log_sales_insight(insight: str, tool_context: ToolContext) -> dict:
    """Record a coaching insight from the live sales call."""
    await tool_context.state["event_queue"].put(
        {"type": "tool_call", "name": "log_sales_insight", "args": {"insight": insight}})
    return {"success": True}

# tools/research_competitor.py — mirrors adk-tools.ts cache + search count logic exactly
async def research_competitor(competitor_name: str, tool_context: ToolContext) -> dict:
    """Research a competitor. Checks cache first; live search costs 1 of 4 allowed per session."""
    metadata = tool_context.state.get("knowledge_metadata")
    if metadata:
        cached = next((c for c in metadata.get("competitorContexts", [])
                       if competitor_name.lower() in c["name"].lower()), None)
        if cached: return cached
    if tool_context.state.get("search_count", 0) >= 4:
        return {"error": "Search limit reached"}
    result = await research_competitor_live(competitor_name, ...)
    tool_context.state["search_count"] = tool_context.state.get("search_count", 0) + 1
    return result
```

### `pyproject.toml` Dependencies

```toml
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "google-adk[vertexai]>=1.0.0",   # NOTE: Python ADK ≥1.0.0, NOT 0.5.0 like the TS package
    "google-cloud-firestore>=2.19",
    "firebase-admin>=6.5",
    "google-genai>=1.0",
    "pydantic-settings>=2.0",
]
```

### Critical Constraints

- `live_request_queue.close()` MUST be called in `finally` — leaked queues drain Gemini quota
- `LiveRequestQueue` MUST be created inside async context
- `asyncio.Queue` for event relay is in-process memory — use single uvicorn worker (not Gunicorn multi-process)
- `instruction` as a callable reads `session.state["system_prompt"]` — enables per-session persona prompts without rebuilding the Agent singleton
- For RAG: omit Vertex RAG retrieval tool initially; add as LRU-cached Runner per `ragCorpusId` in a follow-up

---

## Part 2: Frontend Audio Overhaul

### New Files: `apps/web/public/worklets/`

Next.js serves `public/` statically — no `next.config.ts` changes needed.

**`pcm-recorder-processor.js`** — capture at 16kHz (no downsampling needed since `AudioContext({sampleRate: 16000})`):

```javascript
class PCMRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const pcm = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++)
      pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
    this.port.postMessage(pcm.buffer, [pcm.buffer]); // zero-copy transfer
    return true;
  }
}
registerProcessor("pcm-recorder-processor", PCMRecorderProcessor);
```

**`pcm-player-processor.js`** — ring buffer playback at 24kHz (replaces `AudioBufferSourceNode` scheduling):

```javascript
class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(24000 * 5); // 5-second ring buffer
    this._w = 0;
    this._r = 0;
    this._count = 0;
    this.port.onmessage = (e) => {
      const pcm = new Int16Array(e.data);
      for (let i = 0; i < pcm.length; i++) {
        this._buf[this._w++ % this._buf.length] = pcm[i] / 32768;
        this._count++;
      }
    };
  }
  process(_, outputs) {
    const out = outputs[0]?.[0];
    if (!out) return true;
    for (let i = 0; i < out.length; i++)
      out[i] =
        this._count > 0
          ? (this._buf[this._r++ % this._buf.length],
            this._count--,
            this._buf[(this._r - 1) % this._buf.length])
          : 0;
    return true;
  }
}
registerProcessor("pcm-player-processor", PCMPlayerProcessor);
```

**`vad-processor.js`** — energy-based VAD, sends `activity_start`/`activity_end`:

```javascript
const THRESHOLD = 0.01,
  ONSET = 5,
  OFFSET = 20;
class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._v = 0;
    this._s = 0;
    this._speaking = false;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const energy = input.reduce((s, x) => s + x * x, 0) / input.length;
    if (energy > THRESHOLD) {
      this._v++;
      this._s = 0;
      if (!this._speaking && this._v >= ONSET) {
        this._speaking = true;
        this.port.postMessage({ type: "vad", event: "activity_start" });
      }
    } else {
      this._s++;
      this._v = 0;
      if (this._speaking && this._s >= OFFSET) {
        this._speaking = false;
        this.port.postMessage({ type: "vad", event: "activity_end" });
      }
    }
    return true;
  }
}
registerProcessor("vad-processor", VADProcessor);
```

### Changes to `apps/web/hooks/use-gemini-live.ts`

The hook's public interface to `roleplay-session.tsx` stays identical. Internal plumbing replaces:

| Remove                                               | Replace with                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `processorRef` (ScriptProcessorNode)                 | `AudioWorkletNode` at 16kHz (`pcm-recorder-processor`)                  |
| Linear downsampling loop (lines 592-613)             | Eliminated — `AudioContext({sampleRate: 16000})` is native              |
| Base64 JSON audio send                               | `ws.send(pcmArrayBuffer)` — binary frame                                |
| `audioQueueRef` + `AudioBufferSourceNode` scheduling | `AudioWorkletNode` ring buffer at 24kHz (`pcm-player-processor`)        |
| `nextStartTimeRef`, `pendingBuffersRef`              | Eliminated by ring buffer                                               |
| `isPlayingQueueRef`, `playAudioQueue` callback       | Eliminated                                                              |
| Server-side VAD only                                 | `VADProcessor` worklet → JSON `{type:"vad",event:"activity_start/end"}` |

**Key changes in `connect()`:**

```typescript
// Capture (16kHz)
const captureCtx = new AudioContext({ sampleRate: 16000 });
await captureCtx.audioWorklet.addModule("/worklets/pcm-recorder-processor.js");
const recorderNode = new AudioWorkletNode(captureCtx, "pcm-recorder-processor");
micSource.connect(recorderNode);
recorderNode.port.onmessage = (e) => {
  if (!isMutedRef.current && wsRef.current?.readyState === WebSocket.OPEN)
    wsRef.current.send(e.data); // Binary ArrayBuffer
};

// VAD
await captureCtx.audioWorklet.addModule("/worklets/vad-processor.js");
const vadNode = new AudioWorkletNode(captureCtx, "vad-processor");
micSource.connect(vadNode);
vadNode.port.onmessage = (e) => wsRef.current?.send(JSON.stringify(e.data));

// Playback (24kHz)
const playbackCtx = new AudioContext({ sampleRate: 24000 });
await playbackCtx.audioWorklet.addModule("/worklets/pcm-player-processor.js");
const playerNode = new AudioWorkletNode(playbackCtx, "pcm-player-processor");
playerNode.connect(playbackCtx.destination);
playerNodeRef.current = playerNode;
```

**`ws.onmessage` change** — Python service sends binary frames for audio:

```typescript
ws.onmessage = (e: MessageEvent) => {
  if (e.data instanceof ArrayBuffer || e.data instanceof Blob) {
    const toBuffer =
      e.data instanceof Blob ? e.data.arrayBuffer() : Promise.resolve(e.data);
    toBuffer.then((buf) => {
      playerNodeRef.current?.port.postMessage(buf, [buf]);
      setIsAISpeaking(true);
    });
  } else {
    handleServerMessage(JSON.parse(e.data)); // Existing JSON handler unchanged
  }
};
```

**URL change** — point to Python service:

```typescript
// apps/web/config/env.ts — add:
NEXT_PUBLIC_LIVE_AGENT_URL: z.string().default("ws://localhost:5000");

// In hook:
const wsUrl = `${env.NEXT_PUBLIC_LIVE_AGENT_URL}/ws/${sessionId}?api_key=...&team_id=...`;
```

**`toggleMic`** — disconnect/reconnect `recorderNodeRef.current` from mic source (same logic as current `processorRef` disconnect).

---

## Part 3: Debrief Reliability Fix

### Schema Addition — `packages/shared/src/types.ts`

```typescript
export type DebriefStatus = "pending" | "generating" | "ready" | "failed";
export interface CallSession {
  /* existing fields */ debriefStatus?: DebriefStatus;
}
```

### New Endpoint — `apps/api/src/routes/session.ts`

Add `POST /api/session/debrief-async`:

- Validates body (Zod): `sessionId`, `callSessionId`, `transcript`, `personaName`, `personaRole`, `durationSeconds`, optional `objections`, `moods`, `teamId`, `userId`
- Sets `debriefStatus: "generating"` on both Firestore docs via firebase-admin
- Responds **202 Accepted** immediately
- Fires `generateDebriefBackground()` as a detached async job (no await)
- On success: sets `debrief + debriefStatus: "ready"` via firebase-admin
- On failure: sets `debriefStatus: "failed"`

### Change in `apps/web/components/roleplay-session.tsx`

Remove the fire-and-forget IIFE (lines ~446-471). Replace with:

```typescript
// After updateCallSession(), before router.push():
fetch(`${env.NEXT_PUBLIC_API_URL}/api/session/debrief-async`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.NEXT_PUBLIC_API_SECRET_KEY}`,
  },
  body: JSON.stringify({
    sessionId,
    callSessionId,
    transcript,
    personaName,
    personaRole,
    durationSeconds,
    objections,
    moods,
    teamId,
    userId,
  }),
}).catch(console.error); // Fire and forget the HTTP request — server handles the job

router.push(`/dashboard/history/${sessionId}`);
```

### Firestore Listener — History Page

Use `onSnapshot` to watch `callSessions/{sessionId}.debriefStatus`:

```typescript
useEffect(() => {
  if (!callSession || callSession.debriefStatus === "ready") return;
  return onSnapshot(doc(db, "callSessions", sessionId), (snap) => {
    const data = snap.data() as CallSession;
    if (data.debriefStatus === "ready")
      setCallSession((prev) => ({ ...prev!, ...data }));
  });
}, [callSession?.debriefStatus]);
```

### New File: `apps/api/src/services/firestore-admin.ts`

Export `adminFirestore` (firebase-admin `Firestore`) for server-side writes. Firebase Admin is already in `apps/api/package.json` — just export the admin db client.

---

## Part 4: Firestore Consolidation

### Migration Script — `apps/api/src/scripts/migrate-sessions.ts`

- Reads all docs from `sessions` collection
- Skips any `sessionId` that already exists in `callSessions`
- Maps `Session` fields to `CallSession` schema (transcript string → `transcript`, evaluation → `legacyEvaluation`, dates estimated)
- Batch-writes to `callSessions`
- Run once: `npx tsx apps/api/src/scripts/migrate-sessions.ts`

### `apps/web/lib/db/sessions.ts` Changes

- `saveSession()` → writes to `callSessions` only
- `updateSession()` → writes to `callSessions` only
- `getAllSessions()` → delegates to `getAllCallSessions()`
- `deleteSession()` → deletes from `callSessions` only
- Remove all `collection("sessions")` references

### `apps/web/components/roleplay-session.tsx` Changes

- Remove `saveSession(session)` call (keep only `createCallSession` + `updateCallSession`)

---

## Part 5: Docker / Dev Setup

### `docker-compose.yml` Addition

```yaml
live-agent:
  build: { context: apps/live-agent, dockerfile: Dockerfile }
  ports: ["5000:5000"]
  environment:
    - GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}
    - GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION:-us-central1}
    - API_SECRET_KEY=${API_SECRET_KEY:-reptrainer-secret-123}
    - GOOGLE_APPLICATION_CREDENTIALS=/secrets/sa-key.json
  volumes:
    - ${GOOGLE_APPLICATION_CREDENTIALS}:/secrets/sa-key.json:ro
  depends_on: [api]
```

### New Environment Variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_LIVE_AGENT_URL=ws://localhost:5000

# apps/live-agent/.env (same GCP creds as apps/api/.env)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
API_SECRET_KEY=reptrainer-secret-123
```

---

## Ordered Execution Sequence

### Phase A — Foundation (no user-facing changes)

1. Add `debriefStatus` to `CallSession` in `packages/shared/src/types.ts`
2. Add `apps/api/src/services/firestore-admin.ts` (admin Firestore client)
3. Add `POST /api/session/debrief-async` to `apps/api/src/routes/session.ts`
4. Run Firestore migration script (one-time)

### Phase B — Python ADK Service (can run parallel with A)

5. Create `apps/live-agent/` directory + `pyproject.toml` + `Dockerfile`
6. Implement `config.py`, `auth.py`, `firestore_client.py`, `vertex_search.py`
7. Implement tools: `log_sales_insight`, `log_objection`, `update_persona_mood`, `end_roleplay` (simple), then `research_competitor` (cache logic)
8. Implement `agent.py` (singleton runner)
9. Implement `main.py` (full bidirectional WS handler)
10. Test with a mock Python WebSocket client before connecting frontend

### Phase C — AudioWorklet Files

11. Create `apps/web/public/worklets/pcm-recorder-processor.js`
12. Create `apps/web/public/worklets/pcm-player-processor.js`
13. Create `apps/web/public/worklets/vad-processor.js`
14. Test each worklet in a standalone HTML test page

### Phase D — Frontend Hook Overhaul

15. Modify `apps/web/hooks/use-gemini-live.ts`:
    - Add new refs (captureCtx, playbackCtx, playerNode, recorderNode, vadNode)
    - Replace ScriptProcessorNode with AudioWorklet recorder
    - Replace audioQueueRef/playAudioQueue with player worklet
    - Add VAD worklet
    - Change `getWsUrl` to point to Python service
    - Change `ws.onmessage` to handle binary frames
    - Update cleanup + toggleMic
16. Add `NEXT_PUBLIC_LIVE_AGENT_URL` to `apps/web/config/env.ts`

### Phase E — Debrief IIFE Fix

17. Replace fire-and-forget IIFE in `roleplay-session.tsx` with `fetch` to `/debrief-async`
18. Add Firestore `onSnapshot` listener in history page for `debriefStatus`

### Phase F — Firestore Cleanup

19. Remove `saveSession` dual write from `roleplay-session.tsx`
20. Redirect `sessions` functions in `sessions.ts` to `callSessions`
21. Update `docker-compose.yml`

---

## Verification

### Unit / Integration

- Test Python tools in isolation: call each tool function directly with a mock `ToolContext`
- Test `research_competitor` cache hit vs. live search path separately
- Run existing TypeScript `pnpm typecheck` — shared types changes must not break

### End-to-End Flow

1. `docker-compose up --build` (or `pnpm dev` + `uvicorn main:app --reload`)
2. Open browser → Train page → select persona → start call
3. Verify binary audio frames reach Python service (check server logs)
4. Verify AI voice plays back via AudioWorklet (no ScriptProcessorNode warnings in devtools)
5. Speak for 30s → verify VAD `activity_start`/`activity_end` events fire
6. Verify persona mood updates arrive in the Vibe Meter sidebar
7. Verify `log_sales_insight` events appear in the Whisper Coach HUD
8. End call → verify `debriefStatus: "generating"` immediately visible on history page
9. Wait ~30s → verify `debriefStatus: "ready"` updates via Firestore listener (no page reload)
10. Simulate tab-close mid-debrief → verify server job still completes and debrief appears on reload

### Reconnection

- Kill the browser tab mid-call → reconnect → verify `has_greeted` state is preserved (no duplicate greeting)
- Disconnect Python service → reconnect → verify ADK `session_resumption` resumes correctly

---

## Critical Files

| File                                       | Role                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/services/gemini-live.ts`     | Canonical reference for session lifecycle, tool emission protocol, reconnect behavior — replicate exactly in Python |
| `apps/api/src/services/adk-tools.ts`       | Source of truth for all 5 tool definitions, parameter schemas, cache logic to port to Python                        |
| `apps/web/hooks/use-gemini-live.ts`        | Largest frontend change — public interface must stay stable                                                         |
| `apps/web/components/roleplay-session.tsx` | IIFE debrief removal + dual-write removal — `handleEndCall` is the critical section                                 |
| `apps/web/lib/db/sessions.ts`              | All Firestore collection references to consolidate                                                                  |
| `packages/shared/src/types.ts`             | Schema additions must be backward-compatible                                                                        |
