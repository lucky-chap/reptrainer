# RepTrainer (DealPilot)

> A real-time AI flight simulator for enterprise sales teams.

AI-powered sales roleplay platform that simulates high-pressure buyer conversations using voice-based roleplay with Gemini Live API.

---

## Monorepo Structure

```
reptrainer/
├── apps/
│   ├── web/          →  Next.js frontend (TypeScript, Tailwind, shadcn)
│   └── api/          →  Express backend (TypeScript, Gemini AI)
├── packages/
│   ├── shared/       →  Shared types, constants, utilities
│   └── tsconfig/     →  Shared TypeScript configurations
├── plans/            →  Product specs & implementation plans
├── package.json      →  Root workspace scripts
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com)

### Install Dependencies

```bash
pnpm install
```

### Configure Environment

```bash
# API backend
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your GEMINI_API_KEY

# Web frontend
# Edit apps/web/.env.local with your GEMINI_API_KEY
```

### Run Development Servers

```bash
# Start both web and API concurrently
pnpm dev

# Or start individually
pnpm dev:web    # Next.js on http://localhost:3000
pnpm dev:api    # Express on http://localhost:4000
```

### Build

```bash
pnpm build      # Build all packages
pnpm build:web  # Build only web
pnpm build:api  # Build only API
```

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Frontend  | Next.js 16, React 19, Tailwind CSS 4, shadcn |
| Backend   | Express 5, TypeScript, Zod                   |
| AI (Live) | Gemini Live API via `@google/genai`          |
| AI (Text) | Gemini 2.5 Flash                             |
| Storage   | IndexedDB (client-side MVP)                  |
| Tooling   | pnpm workspaces, tsx                         |

## API Endpoints

| Method | Path                    | Description                   |
| ------ | ----------------------- | ----------------------------- |
| GET    | `/api/health`           | Health check                  |
| POST   | `/api/auth/token`       | Get Gemini API key            |
| POST   | `/api/persona/generate` | Generate buyer persona via AI |
| POST   | `/api/session/evaluate` | Evaluate roleplay via AI      |
