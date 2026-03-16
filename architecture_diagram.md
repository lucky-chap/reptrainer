# Architecture Diagram

This diagram represents the system architecture for Reptrainer (DealPilot), illustrating the flow of real-time audio, agentic reasoning, and multimodal state management.

```mermaid
graph TB
    subgraph Client ["Frontend (Next.js)"]
        UI["UI (React + Tailwind)"]
        Hook["useGeminiLive Hook"]
        VAD["Web Audio API + VAD"]
    end

    subgraph API_Orchestrator ["API Proxy (Express.js)"]
        Exp["Express Server / Auth"]
        NanoB["Nano Banana Service"]
        Debrief["Debrief Orchestration"]
        Eval["Evaluation Service"]
    end

    subgraph Live_Agent_Service ["Live Agent (Python ADK)"]
        FastAPI["FastAPI WebSocket"]
        ADK["ADK Runner / Gemini Live"]
        PE["Persona Engine"]
        Analysis["Live Analysis Task"]
    end

    subgraph External_Services ["Managed Infrastructure"]
        subgraph Firebase ["Firebase & GCP"]
            Auth["Firebase Auth"]
            FS["Firestore (State/RAG)"]
            Store["Storage (Audio/Assets)"]
            VertexAI["Vertex AI / Gemini 1.5"]
            SearchAI["Google Search Grounding"]
        end
    end

    %% Client flows
    UI <--> Hook
    Hook <--> VAD
    Hook -- "WebSocket (Bidi Audio/VAD)" --> FastAPI

    %% API Orchestrator flows
    UI -- "REST API (Session/Auth)" --> Exp
    Exp -- "Orchestrate" --> Debrief
    Debrief -- "Evaluate" --> Eval
    Debrief -- "Visual Assets" --> NanoB
    Debrief -- "Slide Generation" --> VertexAI
    Eval -- "Grading / Score" --> VertexAI
    Debrief -- "Save Results" --> FS
    Eval -- "Fetch Transcript" --> FS
    Exp -- "Save State" --> FS
    Exp -- "Fetch/Save Assets" --> Store

    %% Live Agent flows
    FastAPI <--> ADK
    ADK -- "Persona Context" --> PE
    ADK -- "Real-time Bidi Audio" --> VertexAI
    PE -- "RAG / Grounding" --> FS
    ADK -- "Trigger Analysis" --> Analysis
    Analysis -- "Logged Insights" --> FS
```

## Data Flow Summary

1.  **Live Session**: The frontend captures PCM audio and detects Voice Activity (VAD), streaming it directly to the Python Live Agent service via WebSockets.
2.  **Agentic Reasoning**: The Python service uses the Agent Development Kit (ADK) to interface with the Gemini Live API, providing real-time persona-based roleplay.
3.  **Multimodal Debrief**: Upon session completion, the Express backend orchestrates a complex "Debrief" generation flow:
    - **Gemini 1.5 Pro** analyzes the transcript to generate 4 coaching slides.
    - **Nano Banana** generates specific infographics for each slide.
    - **Cloud TTS** generates a personalized voiceover for each slide.
    - Assets are stored in **Firebase Storage** and delivered to the user as a synchronized multimodal presentation.
