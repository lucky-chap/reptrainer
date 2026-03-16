# Submission: Reptrainer (DealPilot)

## 🖊️ Text Description

### Summary

Reptrainer is a real-time AI "flight simulator" for enterprise sales teams. It allows sales representatives to practice high-pressure buyer conversations using low-latency voice roleplay. The core experience is driven by the Gemini Live API, providing a seamless, natural conversation flow where the AI buyer can be interrupted, challenged, and guided just like a real prospect.

### Key Features

- **Live Voice Roleplay**: High-fidelity, real-time voice interaction using the Gemini Live API and ADK.
- **Whisper Coach**: A real-time HUD that analyzes the conversation in the background and provides tactical nudges.
- **Multimodal AI Debrief (Gemini Native Output)**: Generates a synchronized 4-slide presentation after each session using Gemini's native multimodal output — coaching text and infographic images are generated together in a single API call, producing contextually coherent visuals that directly reflect the coaching analysis. Features:
  - AI-analyzed coaching insights with inline-generated infographics (single Gemini call).
  - Personalized audio narration via Cloud TTS.
  - Automatic fallback to Nano Banana pipeline for resilience.
- **RAG-Grounded Personas**: Buyer personas are grounded in the user's uploaded product documentation and competitor "battle cards."

### Technologies Used

- **Gemini Live API & ADK**: For the real-time bidirectional voice agent.
- **Gemini 2.5 Flash (Multimodal Output)**: For unified debrief generation — produces coaching analysis text and infographic images in a single interleaved response using `responseModalities: ['TEXT', 'IMAGE']`.
- **Gemini 2.5 Flash**: For conversation analysis, grading, and persona generation.
- **Vertex AI (Nano Banana)**: For persona avatars and fallback debrief visuals.
- **Google Cloud TTS**: For debrief narration.
- **Firebase (Auth, Firestore, Storage)**: For real-time state synchronization and asset management.
- **Next.js & Express**: Full-stack framework for the web dashboard and proxy layer.

### Findings and Learnings

- **The Power of Interruption**: One of the biggest technical hurdles was managing WebSocket latency to ensure the AI "stops" speaking instantly when the user interrupts. Leveraging the ADK's VAD triggers significantly improved the "feel" of natural conversation.
- **The Battle for Brevity in Live Audio**: Unlike text chat where detailed responses are helpful, live voice interactions demand extreme brevity. We discovered that any AI response over 15-20 seconds feels like a monologue and discourages user interaction. We had to implement strict "Max 3 Sentences" guards in the system prompt and explicitly instruct the model to use natural pauses and keep-it-short prompts to maintain a true back-and-forth flow.
- **Tool Calling Latency vs. Immersion**: Executing tools (like Google Search or competitor research) during a live roleplay creates a "dead air" gap that can break the user's immersion. We found that the most effective solution was prompting the AI to use natural "filler" phrases (e.g., "One second, let me verify that detail...") while the tool executes, and ensuring that tool results are synthesized into a single natural conversational sentence rather than recited as raw data.
- **Unified Multimodal Output > Multi-Service Pipelines**: Our biggest performance win came from replacing the 3-service debrief pipeline (Gemini text → Nano Banana → Cloud TTS) with Gemini's native multimodal output (`responseModalities: ['TEXT', 'IMAGE']`). A single API call now generates coaching text and contextually coherent infographics together, cutting latency by ~60% and eliminating the "lost in translation" problem where separately-generated images didn't match the coaching narrative.
- [x] **GCP Integration**: Using a unified Google Cloud ecosystem (Vertex AI + Firebase + TTS) allowed us to build complex multimodal features with minimal glue code, as the SDKs handle authentication and data flow seamlessly.

## 🖥️ Proof of Google Cloud Deployment

Reptrainer leverages the following Google Cloud services, satisfying the hackathon requirement for "Proof of Google Cloud Deployment" via code implementation (Option 2):

- **Vertex AI (Gemini 1.5 Pro/Flash)**: Orchestrates session evaluation, persona generation, and deep-search grounding.
  - [Initialization (L21-29)](./apps/api/src/services/vertex.ts#L21-29)
  - [Search Grounding (L68-83)](./apps/api/src/services/vertex.ts#L68-83)
  - [Evaluation (L365-371)](./apps/api/src/services/vertex.ts#L365-371)
- **Gemini Multimodal Output**: Generates coaching text + infographic images in a single unified API call using native interleaved output.
  - [Multimodal Debrief Generation](./apps/api/src/services/vertex.ts#L600-L700)
  - [Unified Debrief Route](./apps/api/src/routes/session.ts#L58-L175)
- **Nano Banana**: Generates photorealistic persona avatars (and fallback debrief infographics).
  - [Image Generation (L390-397)](./apps/api/src/services/vertex.ts#L390-397)
  - [Infographic Fallback (L447-472)](./apps/api/src/services/vertex.ts#L447-472)
- **Cloud TTS**: Synthesizes multi-slide coaching narrations.
  - [Synthesis (L11-25)](./apps/api/src/services/tts.ts#L11-25)
  - [Route Integration (L104-120)](./apps/api/src/routes/session.ts#L104-120)
- **Gemini Live API (ADK)**: Provides the core real-time bidirectional audio experience.
  - [Bidi Config (L156-170)](./apps/live-agent/app/main.py#L156-170)
  - [Live Flow Implementation (L264-269)](./apps/live-agent/app/main.py#L264-269)
- **Grounding & RAG**: Extends model knowledge with live web data and proprietary materials.
  - [Google Search Tool (L72-82)](./apps/api/src/services/vertex.ts#L72-82)
  - [Knowledge Base RAG (L142, L309, L489)](./apps/api/src/services/vertex.ts#L142-L493)
- **Firebase & Cloud Storage**: Orchestrates real-time state and multimodal asset hosting.
  - [Admin SDK Init (L4-13)](./apps/api/src/config/firebase.ts#L4-13)
  - [Cross-Origin Policy (CORS)](./apps/web/cors.json) — Applied via `gsutil cors set`
  - [Storage Security Rules](./apps/web/storage.rules)

**Bonus: Automation & Scalability**
The project is optimized for industrial-grade deployment using **Google Cloud Build** and **Cloud Run**:

- **Build Pipeline**: [cloudbuild.yaml](./cloudbuild.yaml) automates the multi-service build and containerization process.
- **Serverless Scaling**: Stateless architecture allows for seamless horizontal scaling on Google Cloud Run.
- **Docker Integration**: [Web](./apps/web/Dockerfile), [API](./apps/api/Dockerfile), and [Live Agent](./apps/live-agent/Dockerfile) each feature production-ready Dockerfiles.

## 📹 Demo Video Script (Draft)

**Target Duration: 3:30 minutes**

1.  **Introduction (0:00 - 0:45)**: Explain the problem (high-stakes sales calls are scary to practice). Show the "DealPilot" dashboard and the library of personas.
2.  **Live Roleplay (0:45 - 2:15)**:
    - Start a "Live Call" with a "Tough Decision Maker."
    - Demonstrate **Multimodality**: Talk to the AI, show it responding with a distinct voice.
    - Demonstrate **Interruption**: Interrupt the AI while it's pitching a competitor. Show it handling the break gracefully and pivoting.
    - Show the **Whisper Coach** nudges appearing in real-time.
3.  **The Debrief (2:15 - 3:00)**:
    - End the call. Show the "Generating Your Coach Debrief" loading state.
    - Present the **4-slide Multimodal Debrief**: Play the audio narration with infographics generated natively by Gemini in a single unified call. Show the "Before vs. After" comparison slide where the image directly reflects the coaching analysis.
4.  **Conclusion & Value (3:00 - 3:30)**: Summarize how this solves the training gap and the impact of using Gemini's native live capabilities.

## Inspiration

Sales is a high-stakes performance, but practicing it often feels either boring or "cringe." Most reps walk into critical discovery calls with sweaty palms because they haven't "repped" the scenario in a realistic environment. We were inspired by flight simulators for pilots—why couldn't sales reps have a safe, high-fidelity place to practice fumbling on pricing or handling a tough CFO? The release of the **Gemini Live API** was the missing link, finally allowing us to build a voice-first "simulator" that feels human, responsive, and truly reactive.

## What it does

Reptrainer (DealPilot) is a real-time AI training ground for enterprise sales.

- **Voice-First Roleplay**: Practice discovery and closing calls with AI buyer personas that sound human and can be interrupted.
- **Whisper Coach**: A live HUD that "whispers" tactical advice (e.g., "Pivot to ROI") while you speak.
- **Grounded Personas**: AI buyers aren't just generic bots; they are grounded in your actual product docs and competitor "battle cards" using RAG.
- **Multimodal Debrief**: After every session, Gemini generates a personalized 4-slide "Executive Coaching" presentation using native multimodal output — coaching text and infographic images are produced together in a single call, with Cloud TTS narration layered on top.
- **Performance Analytics**: Team leaders can track skill gaps across the entire organization (Discovery, Closing, Objection Handling).

## How we built it

We built Reptrainer as a distributed multimodal architecture:

- **Frontend**: A **Next.js** application utilizing the **Web Audio API** with custom **Worklets** for 16kHz PCM capture and Voice Activity Detection (VAD).
- **Real-Time Brain**: A **Python** service powered by the **Google ADK (Agent Development Kit)** and **FastAPI**, which manages bidirectional streaming with the **Gemini Live API**.
- **Orchestration**: An **Express.js** API that coordinates the "Debrief" flow using **Gemini's native multimodal output** to generate coaching text and infographic images in a single call, plus **Cloud TTS** for narration. Falls back to the legacy Nano Banana pipeline for resilience.
- **Infrastructure**: **Firebase** (Auth, Firestore, Storage) provides the real-time state sync and asset hosting, while **Google Cloud Build** and **Cloud Run** ensure a seamless CI/CD pipeline.

## Challenges we ran into

- **The "Barge-In" Problem**: Achieving zero-latency interruption (barge-in) was our biggest hurdle. We had to optimize the WebSocket bridge and fine-tune VAD parameters in the browser to ensure the AI "stops" instantly when the user speaks.
- **Multimodal Synchronization → Unified Output**: Our original pipeline stitched together 3 separate services (Gemini text → Nano Banana images → Cloud TTS) with 12+ sequential API calls per debrief. We solved this by migrating to Gemini's native multimodal output, generating coaching text and infographics in a single API call. This eliminated the text-image coherence gap and dramatically reduced latency.
- **Balancing Depth vs. Latency**: Grounding the AI in complex product documents (RAG) while maintaining the conversational speed required for a voice call was a constant balancing act between retrieved context and response time.

## Accomplishments that we're proud of

- **Natural Conversation Flow**: We successfully moved beyond "robotic" turn-taking. The AI handles interruptions and tangents with a level of realism that actually helps users build muscle memory.
- **The "Wow" Factor of the Debrief**: Seeing a user's face when they receive a narrated, visual presentation analyzing their performance just seconds after hanging up — now powered by Gemini's unified multimodal output where the model generates coaching insights and contextually-aware infographics together in one call.
- **Deep Grounding**: Creating a system where a CFO persona can raise an objection specifically about a competitor's recent price hike because it was in the uploaded "battle card."

## What we learned

- **Multimodal Feedback is Key**: Sales reps engage significantly more with visual and auditory feedback than with simple text reports.
- **Unified Ecosystem Efficiency**: Staying within the Google Cloud/Firebase ecosystem allowed us to build features in days that would have taken weeks if we were stitching together disconnected providers.
- **Coupling Context**: We learned that for roleplay to be effective, the AI must "know" the product it is buying. Generic personas lead to generic practice.

## What's next for Reptrainer

- **Gemini Vision Integration**: We want the AI to "see" the rep to provide coaching on eye contact, body language, and confidence signals.
- **Multi-Buyer Committee**: Roleplay sessions with 2-3 different AI stakeholders (e.g., the CFO, the Technical Lead, and the Champion) in the same call.
- **Screen-Share Reaction**: Enabling the persona to react in real-time to the pitch deck or product demo the rep is sharing on their screen.

---

## 🏗️ Architecture Diagram

(Refer to [architecture_diagram.md](file:///home/obed/code/reptrainer/mermaid.md) for the visuals)
