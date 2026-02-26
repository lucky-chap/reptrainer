# Reptrainer MVP Implementation Plan

## Architecture Decisions

1. **Frontend**: Next.js (TypeScript) with Tailwind CSS v4 + shadcn UI
2. **Storage**: IndexedDB via `idb` library (no backend database)
3. **AI - Live Voice**: `@google/genai` Live API (WebSocket, browser mic → Gemini, audio back to browser)
4. **AI - Evaluation**: Gemini text model via Next.js API route
5. **Auth**: None (MVP)
6. **API Key**: Ephemeral tokens via Next.js API route for secure client-side Live API usage

## Implementation Steps

### Phase 1: Foundation

- [x] Install `@google/genai` and `idb`
- [x] Set up IndexedDB storage layer (products, personas, sessions)
- [x] Set up dark theme + design tokens
- [x] Create app layout with navigation

### Phase 2: Product Setup

- [x] Product form (company name, description, objections)
- [x] Product list view
- [x] Save/load from IndexedDB

### Phase 3: Persona Generator

- [x] API route: POST /api/persona/generate (Gemini text model)
- [x] Persona display with traits
- [x] Save to IndexedDB

### Phase 4: Live Roleplay (Core Feature)

- [x] Ephemeral token API route
- [x] Gemini Live session manager (WebSocket)
- [x] Browser microphone capture (MediaRecorder → PCM)
- [x] Audio playback (PCM → AudioContext)
- [x] Live transcript panel
- [x] Start/End call controls
- [x] System prompt injection with persona + product context

### Phase 5: Post-Call Evaluation

- [x] API route: POST /api/session/evaluate
- [x] Structured scoring UI (objection, confidence, clarity)
- [x] Strengths/weaknesses/tips display
- [x] Save evaluation to IndexedDB

### Phase 6: Polish

- [x] Session history view
- [x] Smooth transitions/animations
- [x] Error handling
- [x] Loading states
