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
- **🔄 Automatic Reconnection**: WebSocket connection with exponential backoff reconnection for reliable real-time sessions.
- **📝 Live Transcript**: Real-time transcript display with word-by-word reveal synced to audio playback.

---

## 🧩 Core Concepts

### Product-Persona Coupling

In Reptrainer, **Personas are tightly coupled to specific Products**.

Unlike generic AI chatbots, each buyer persona is generated with deep context about the product they are "buying." This includes:

- **Product-Specific Objections**: The AI knows the common friction points for that specific industry and solution.
- **Competitor Awareness**: Personas are aware of the specific competitors defined in the Product context.
- **Tailored Personalities**: A CFO persona for a cybersecurity product will have different priorities and skepticism than a CFO persona for an HR software.

This architectural decision ensures that every roleplay session is highly relevant and provides the most realistic training environment possible.

### Grounding & Context Strategy (RAG)

Because Reptrainer uses AI for sales roleplay, there is a strict boundary between what the AI _knows_ (as the evaluator) and what the AI _portrays_ (as the naive buyer).

1. **Seller-Side Grounding (Evaluation Rubric)**: The AI is fed your product's value propositions and technical details via RAG. However, it is explicitly instructed **not** to recite this knowledge. Instead, it uses this data as a hidden rubric to grade the sales rep. If the rep fails to articulate the value prop clearly, the AI acts confused and forces the rep to earn their understanding.
2. **Objections Grounding (Battle Cards)**: The persona doesn't invent random reasons not to buy; it is fed the exact, real-world objections your sales team faces from your Knowledge Base.
3. **Buyer-Side Grounding (Future / Google Search)**: To make the persona's identity more realistic, buyer-side grounding pulls real-world data about the prospect's company (e.g., via Google Search grounding tools). This allows the AI to naturally reference their actual industry vocabulary, recent company news, or real competitors they use during the discovery phase of the call.

---

## 🏗️ Monorepo Structure

```
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

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the following APIs:
   - **Vertex AI API**
   - **Cloud Text-to-Speech API**
3. Create a Service Account with `Vertex AI User` and `Cloud Text-to-Speech User` roles.
4. Download the JSON key and set `GOOGLE_APPLICATION_CREDENTIALS` if running outside of GCP.
5. Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

#### 2. Firebase

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. **Authentication**: Enable Google Sign-In.
3. **Firestore**: Create a database in Native mode.
4. **Storage**: Enable Firebase Storage.
5. **Web App**: Register a new Web App to get your Firebase config keys.
6. **CORS**: Configure CORS for Firebase Storage:

```json
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Save as `cors.json` and apply:

```bash
gsutil cors set cors.json gs://your-bucket-name
```

#### 3. Deploying Rules and Indices

The project includes pre-configured security rules and Firestore indices.

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

---

## 💻 Environment Variables

### API Backend (`apps/api/.env`)

```bash
# Environment
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
API_SECRET_KEY=your-secure-secret-key-here

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Google Cloud
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_LOCATION=europe-west1 # Note: Currently, RAG requires the `europe-west1` region to function correctly due to capacity limits.

# Optional: Google Application Credentials (if running outside GCP)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Web Frontend (`apps/web/.env.local`)

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Secret Key (must match API_SECRET_KEY in backend)
NEXT_PUBLIC_API_SECRET_KEY=your-secure-secret-key-here

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Required Environment Variables Summary

| Variable                     | Location  | Description                             |
| ---------------------------- | --------- | --------------------------------------- |
| `PORT`                       | API       | Server port (default: 4000)             |
| `API_SECRET_KEY`             | API + Web | Secret key for WebSocket authentication |
| `GEMINI_API_KEY`             | API       | Google AI Studio API key                |
| `GOOGLE_CLOUD_PROJECT`       | API       | GCP project ID                          |
| `GOOGLE_CLOUD_LOCATION`      | API       | GCP region (e.g., us-central1)          |
| `NEXT_PUBLIC_API_URL`        | Web       | Backend API URL                         |
| `NEXT_PUBLIC_API_SECRET_KEY` | Web       | Must match API's secret key             |
| `NEXT_PUBLIC_FIREBASE_*`     | Web       | Firebase web app config                 |

---

## 🏃 Running the Application

### Local Development

1. **Clone and install**:

   ```bash
   git clone https://github.com/your-username/reptrainer.git
   cd reptrainer
   pnpm install
   ```

2. **Configure environment variables**:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   # Edit both files with your configuration
   ```

3. **Start development servers**:

   ```bash
   pnpm dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:4000

### Docker Setup

1. **Configure environment variables**:

   ```bash
   # Create apps/api/.env and apps/web/.env.local with your config
   ```

2. **Build and start**:

   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:4000

### Production Build

```bash
# Build all packages
pnpm build

# Start production servers
pnpm start
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

## 🔌 WebSocket Protocol

The real-time communication uses WebSockets at `/api/live`.

### Client → Server Messages

| Type          | Description                            |
| ------------- | -------------------------------------- |
| `audio`       | Base64-encoded PCM audio (16kHz, mono) |
| `text`        | Text input from user                   |
| `log_insight` | Request manual insight logging         |

### Server → Client Messages

| Type                   | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `connected`            | Session established                             |
| `audio`                | Base64-encoded AI response audio                |
| `turn_complete`        | AI finished speaking                            |
| `input_transcription`  | User's speech transcribed                       |
| `output_transcription` | AI's speech transcribed                         |
| `interrupted`          | AI was interrupted by user                      |
| `tool_call`            | AI triggered a tool (e.g., `log_sales_insight`) |
| `error`                | Error message                                   |
| `closed`               | Session closed                                  |

---

## 🔐 Security Rules

### Firestore Rules (`apps/web/firestore.rules`)

The database uses role-based access control:

- Users can only read/write their own data
- Team admins can read/write team data
- All reads/writes require authentication

### Storage Rules (`apps/web/storage.rules`)

- Users can only upload to their own folder
- Audio recordings stored as `audio/{userId}/{sessionId}.webm`
- Avatar images stored as `avatars/{productId}/{personaId}.png`

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run linting
pnpm lint

# Run type checking
pnpm typecheck
```

---

## 📁 Project Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── routes/          # Express routes
│   │   │   ├── auth.ts      # Authentication routes
│   │   │   ├── live.ts      # WebSocket live session
│   │   │   └── ...
│   │   ├── services/         # Business logic
│   │   │   ├── gemini-live.ts    # Gemini Live proxy
│   │   │   ├── vertex.ts        # Vertex AI helpers
│   │   │   └── ...
│   │   └── index.ts         # Express app entry
│   └── package.json
│
└── web/
    ├── components/          # React components
    │   ├── roleplay-session.tsx
    │   └── ...
    ├── hooks/               # Custom React hooks
    │   ├── use-gemini-live.ts   # Live session hook
    │   └── ...
    ├── lib/                 # Utilities
    ├── app/                 # Next.js App Router
    ├── public/              # Static assets
    └── package.json

packages/
└── shared/
    └── src/
        ├── constants.ts     # Shared constants
        └── types.ts         # TypeScript types
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT
