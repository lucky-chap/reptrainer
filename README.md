# Reptrainer (DealPilot) 🚀

> A real-time AI flight simulator for enterprise sales teams.

Reptrainer is an AI-powered sales roleplay platform that allows sales representatives to practice high-pressure buyer conversations using voice-based roleplay. It leverages the **Gemini Live API** to provide a seamless, low-latency training experience.

---

## ✨ Key Features

- **🎙️ Voice-First Roleplay**: High-fidelity, real-time voice conversations with AI buyer personas via Gemini Live API.
- **👁️ Whisper Coach**: A real-time HUD that analyzes your conversation and "whispers" tactical nudges and objection-handling strategies.
- **🧠 AI Persona Generation**: Instantly generate diverse buyer personas (from Skeptical CFOs to Decision Makers) tailored to your specific product.
- **📊 Coaching Insights**: Advanced analytics that identify skill gaps (Discovery, Closing, Listening, etc) and trends across your team.
- **🎞️ AI Debrief**: Post-session debriefs featuring synchronized audio narration, visual slides, and interactive objection heatmaps.
- **👥 Team Management**: Role-based access control for Admins (Team Leaders) and Members, with aggregated team performance dashboards.

---

## 🧩 Core Concepts

### Product-Persona Coupling

In Reptrainer, **Personas are tightly coupled to specific Products**.

Unlike generic AI chatbots, each buyer persona is generated with deep context about the product they are "buying." This includes:

- **Product-Specific Objections**: The AI knows the common friction points for that specific industry and solution.
- **Competitor Awareness**: Personas are aware of the specific competitors defined in the Product context.
- **Tailored Personalities**: A CFO persona for a cybersecurity product will have different priorities and skepticism than a CFO persona for an HR software.

This architectural decision ensures that every roleplay session is highly relevant and provides the most realistic training environment possible.

---

## 🏗️ Monorepo Structure

```text
reptrainer/
├── apps/
│   ├── web/          → Next.js frontend (TypeScript, Tailwind, shadcn/ui)
│   └── api/          → Express backend (TypeScript, Vertex AI, Gemini)
├── packages/
│   ├── shared/       → Shared types, constants, and utilities
│   └── tsconfig/     → Centralized TypeScript configurations
├── plans/            → Product specs & architectural decisions
├── package.json      → Root workspace management
└── pnpm-workspace.yaml
```

---

## 🛠️ Tech Stack

### Core

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Backend**: [Express.js](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)

### AI & Intelligence

- **Live Voice**: [Gemini Live API](https://aistudio.google.com/) via WebSockets
- **Reasoning**: [Gemini 1.5 Pro/Flash](https://deepmind.google/technologies/gemini/) (via Vertex AI)
- **Narrations**: Google Cloud Text-to-Speech

### Infrastructure

- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Real-time sync)
- **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage)
- **Auth**: [Firebase Authentication](https://firebase.google.com/docs/auth)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: ≥ 20.x
- **pnpm**: ≥ 9.x
- **Google Cloud Project**: With Vertex AI and Cloud TTS enabled.
- **Gemini API Key**: From [Google AI Studio](https://aistudio.google.com/).

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/reptrainer.git
   cd reptrainer
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:

   **Backend (`apps/api/.env`)**:

   ```env
   PORT=4000
   GEMINI_API_KEY=your_key
   CORS_ORIGIN=http://localhost:3000
   ```

   **Frontend (`apps/web/.env.local`)**:

   ```env
   # API URL
   NEXT_PUBLIC_API_URL=http://localhost:4000
   GEMINI_API_KEY=your_key

   # Vertex AI
   GOOGLE_CLOUD_PROJECT=your_project_id
   GOOGLE_CLOUD_LOCATION=us-central1

   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=xxx
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
   # ... add other firebase keys
   ```

### Running Locally

```bash
# Start both Web and API concurrently
pnpm dev

# Individual components
pnpm dev:web    # http://localhost:3000
pnpm dev:api    # http://localhost:4000
```

---

## 📊 Analytics & Insights

The application includes a sophisticated analytics engine that uses pattern recognition to help you grow. **Note: Personal insights and team patterns are generated once at least 3 sessions have been completed.**

- **Discovery**: How well you uncover customer needs.
- **Positioning**: Your ability to align product value.
- **Objection Handling**: Effectiveness in navigating pushback.
- **Closing**: Moving the deal towards the next step.

Managers can view **Team Weakness** alerts to identify where group training is needed most.

---

## 📄 License

MIT
