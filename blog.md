# Building Reptrainer: The AI "Flight Simulator" for Sales with Gemini Live

> **Disclaimer**: This piece of content was created for the purpose of entering the #GeminiLiveAgentChallenge hackathon.

Sales is a high-stakes performance, but until now, practicing for it has felt like a chore. Most representatives walk into critical discovery calls with high anxiety because they haven't "repped" the scenario in a realistic environment.

Enter **Reptrainer (DealPilot)**: a real-time AI training ground built on the cutting edge of the Google Cloud AI ecosystem.

## The Vision: A Safe Space for High-Pressure Conversations

Our goal was to create a "flight simulator" for sales. We wanted to move beyond the robotic, turn-taking chatbots of the past and build something that felt human. The release of the **Gemini Live API** was the missing link, finally allowing us to build a voice-first agent that is responsive, reactive, and capable of natural interruption.

## The Tech Stack: Multimodal by Design

Building a system that listens, thinks, talks, and even "sees" (visualizing debriefs) required a deeply integrated multimodal architecture.

### 1. The Voice Brain: Gemini Live API & Python ADK

The core interaction is powered by a **Python** backend using the **Google Agent Development Kit (ADK)** and **FastAPI**.

- **Bidirectional Streaming**: We leverage WebSockets to stream 16kHz audio from the browser to our ADK-powered agent.
- **Realistic Interruption (Barge-In)**: One of our proudest achievements was tuning Voice Activity Detection (VAD) to ensure the AI "stops" speaking instantly when the user speaks—just like a real prospect would.

### 2. The Multimodal Debrief: Gemini 1.5, Nano Banana, and Cloud TTS

Sales training is only as good as the feedback. After every call, Reptrainer generates a full "Executive Coaching" presentation:

- **Gemini 1.5 Pro**: Analyzes the transcript to identify objections handled correctly and missed opportunities.
- **Nano Banana**: Generates high-fidelity infographics and buyer avatars to make the feedback visually engaging.
- **Google Cloud TTS**: Narrates the debrief, allowing the rep to listen to their coaching while reviewing the slides.

### 3. Grounded Intelligence with Vertex AI RAG

A "generic" buyer persona is useless for enterprise sales. We use **Vertex AI Search (RAG)** in our Node.js orchestrator to ground our personas in actual product documentation and competitor "battle cards." This ensuring that if you mention a specific feature, the AI knows exactly how to push back based on your real-world market position.

## What We Learned (The Hard Way)

Building with Gemini Live taught us several key lessons about the future of voice AI:

- **Brevity is King**: In voice interactions, long responses feel like monologues. We learned to implement strict "Max 3 Sentences" guards to keep the flow conversational.
- **Managing "Dead Air"**: Executing tools (like real-time data lookups) takes time. We coached our AI to use natural filler phrases like _"Hang on, let me check that pricing for you..."_ to maintain immersion while the tools execute in the background.

## Infrastructure: Scalability with Google Cloud

The entire system is hosted on **Google Cloud Run**, orchestrated by **Cloud Build** for a seamless CI/CD pipeline. We use **Firebase** for real-time state synchronization, Firestore for session persistence, and Cloud Storage for hosting the generated audio and visual assets.

The unified Google Cloud ecosystem allowed us to build features in days that would have normally taken weeks of "glue code" with disparate providers.

## What’s Next?

We’re just scratching the surface. Our roadmap includes integrating **Gemini Vision** to provide real-time coaching on body language and eye contact, and simulating "Buying Committees" where you pitch to multiple AI stakeholders at once.

Building Reptrainer has shown us that the future of sales training isn't just AI—it's **Live AI**.

---

_Created for the #GeminiLiveAgentChallenge hackathon._
