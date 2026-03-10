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
- **Docker & Docker Compose**: (Optional, for containerized setup)
- **Google Cloud Project**: With Vertex AI and Cloud TTS enabled.
- **Firebase Project**: With Auth, Firestore, and Storage enabled.

### ⚙️ Services Setup

#### 1. Google Cloud Platform

- Create a project in [Google Cloud Console](https://console.cloud.google.com/).
- Enable the following APIs:
  - **Vertex AI API**
  - **Cloud Text-to-Speech API**
- Create a Service Account with `Vertex AI User` and `Cloud Test-to-Speech User` roles.
- Download the JSON key and set `GOOGLE_APPLICATION_CREDENTIALS` if running outside of GCP.
- Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

#### 2. Firebase

- Create a project in [Firebase Console](https://console.firebase.google.com/).
- **Authentication**: Enable Google Sign-In.
- **Firestore**: Create a database in Native mode.
- **Storage**: Enable Firebase Storage.
- **Web App**: Register a new Web App to get your Firebase config keys.
- **CORS**: Configure CORS for Firebase Storage to allow your local/production domain:
  ```json
  [
    {
      "origin": ["http://localhost:3000"],
      "method": ["GET"],
      "maxAgeSeconds": 3600
    }
  ]
  ```
  Apply using `gsutil cors set cors.json gs://your-bucket-name`.

#### 3. Deploying Rules and Indices

The project includes pre-configured security rules and Firestore indices in `apps/web`.

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```
2. **Login and Select Project**:
   ```bash
   firebase login
   cd apps/web
   firebase use --add  # Select your project ID
   ```
3. **Deploy**:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

### 💻 Local Installation

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

   Copy `.env.example` to `.env` (or `.env.local` for web) in both `apps/api` and `apps/web`:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Running Locally**:

   ```bash
   # Start the monorepo in dev mode
   pnpm dev
   ```

### 🐳 Docker Setup

If you prefer using Docker, ensure you have your `.env` files configured in the root or appropriate app directories.

1. **Build and start services**:

   ```bash
   docker-compose up --build
   ```

2. **Access the application**:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API: [http://localhost:4000](http://localhost:4000)

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
