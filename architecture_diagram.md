# Architecture Diagram

This diagram represents the system architecture for Reptrainer (DealPilot), illustrating the flow of real-time audio, agentic reasoning, and multimodal state management.

```mermaid
graph TD
    subgraph Client ["Frontend (Next.js)"]
        UI["Web UI (React)"]
        Hook["useGeminiLive Hook"]
        Audio["Web Audio API (PCM 16kHz)"]
    end

    subgraph API_Layer ["API Proxy (Express.js)"]
        Proxy["Express Server"]
        Auth["Firebase Auth & Secret Key"]
        Session["Session Service"]
    end

    subgraph AI_Service ["Live Agent (Python ADK)"]
        FastAPI["FastAPI WebSocket"]
        ADK["ADK Wrapper"]
        Persona["Persona Engine"]
        Analysis["Background Analysis Task"]
    end

    subgraph Google_Cloud ["Google Cloud Platform"]
        LiveAPI["Gemini Live API (Vertex AI)"]
        TTS["Cloud Text-to-Speech"]
        Nano Banana["Nano Banana (Multimodal Debrief)"]
        Firestore["Firebase Firestore (Session State)"]
        Storage["Firebase Storage (Audio/Images)"]
    end

    UI <--> Hook
    Hook <--> Audio
    Hook -- "WebSocket (VAD/Audio/Text)" --> FastAPI

    Proxy -- "REST API (Auth/Debrief)" --> UI
    Proxy -- "Orchestration" --> Session

    FastAPI <--> ADK
    ADK -- "Bidi Audio/Tool Calls" --> LiveAPI
    ADK -- "Prompt Context" --> Persona

    ADK -- "Triggers" --> Analysis
    Analysis -- "Feedback Data" --> Firestore

    Proxy -- "Evaluation/Feedback" --> LiveAPI
    Proxy -- "Audio Narration" --> TTS
    Proxy -- "Visual Generation" --> Nano Banana

    Proxy -- "Save Assets" --> Storage
    Proxy -- "Sync State" --> Firestore
```

## Data Flow Summary

1.  **Live Session**: The frontend captures PCM audio and detects Voice Activity (VAD), streaming it directly to the Python Live Agent service via WebSockets.
2.  **Agentic Reasoning**: The Python service uses the Agent Development Kit (ADK) to interface with the Gemini Live API, providing real-time persona-based roleplay.
3.  **Multimodal Debrief**: Upon session completion, the Express backend orchestrates a complex "Debrief" generation flow:
    - **Gemini 1.5 Pro** analyzes the transcript to generate 4 coaching slides.
    - **Nano Banana** generates specific infographics for each slide.
    - **Cloud TTS** generates a personalized voiceover for each slide.
    - Assets are stored in **Firebase Storage** and delivered to the user as a synchronized multimodal presentation.
