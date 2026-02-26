# DealPilot (Working Name)

## AI Sales Roleplay & Performance Simulator

---

# 1. Vision

DealPilot is a real-time AI sales training platform that simulates high-pressure buyer conversations using voice-based roleplay.

Sales reps practice live objection handling.
Managers reduce ramp time.
Organizations increase close rates.

Core idea:

> A flight simulator for sales reps.

---

# 2. Core MVP Goals

The MVP must demonstrate:

1. Upload product information
2. Generate a buyer persona
3. Run real-time voice roleplay using Gemini Live
4. Capture transcript
5. Evaluate performance
6. Return structured coaching feedback

No dashboards.
No billing.
No CRM integration (yet).

---

# 3. High-Level Architecture

## 3.1 Tech Stack

Frontend:

- Next.js (TypeScript)
- WebRTC / browser mic
- Gemini Live via `@google/genai`

Backend:

- Encore (TypeScript)
- REST APIs
- PostgreSQL (via Prisma or direct SQL)

AI:

- Gemini Live (real-time conversation)
- Gemini text model (post-call evaluation)

---

# 4. System Architecture Overview

Frontend
|
| (Start Session)
v
Gemini Live Session (Streaming)
|
| (Transcript captured client-side)
v
Backend (Encore API)
|
| (Save transcript)
| (Run evaluation)
v
Gemini Text Model (Structured scoring)
|
v
Return JSON scores → Frontend Results UI

---

# 5. Core Features

---

## 5.1 Product Setup

### Feature:

Manager uploads:

- Product description
- Target customer profile
- Objection list

### Backend Endpoint:

POST /api/product

### Stored Data:

- product_id
- company_name
- description
- objections[]
- created_at

---

## 5.2 Buyer Persona Generator

System generates persona based on:

- Target customer
- Industry
- Objection type

Example personas:

- Skeptical CFO
- Budget-Conscious Founder
- Enterprise Procurement Lead

Persona traits:

- Aggressiveness level (1–3)
- Interruption frequency
- Objection style

Endpoint:
POST /api/persona/generate

Stored:

- persona_id
- personality_prompt
- intensity_level
- objection_strategy

---

## 5.3 Live Roleplay Session (Gemini Live)

Must use:
`@google/genai`

Not ADK.

Session requirements:

- Real-time voice input
- Real-time voice output
- Streaming transcript
- AI must:
  - Interrupt occasionally
  - Push back twice if weak answer
  - Escalate objection intensity

System Prompt Structure:

Role: Skeptical Enterprise Buyer
Behavior:

- Challenge ROI
- Question pricing
- Demand proof
- Avoid being easily convinced

Frontend Requirements:

- Start Call button
- Live transcript panel
- End Call button

---

## 5.4 Transcript Handling

At end of call:

Send:

- Full transcript
- Persona metadata
- Session duration

To:
POST /api/session/evaluate

Stored:

- session_id
- transcript
- persona_id
- duration
- created_at

---

## 5.5 Post-Call Evaluation

Use Gemini text model to generate structured JSON:

{
objection_handling_score: number (1-10),
confidence_score: number (1-10),
clarity_score: number (1-10),
strengths: string[],
weaknesses: string[],
improvement_tips: string[]
}

Evaluation Criteria:

- Did rep directly address objection?
- Did rep quantify value?
- Did rep avoid rambling?
- Did rep handle pushback confidently?

Return structured JSON to frontend.

---

# 6. Data Models

## Product

- id: string
- company_name: string
- description: text
- objections: string[]
- created_at: datetime

## Persona

- id: string
- product_id: string
- name: string
- personality_prompt: text
- intensity_level: number
- created_at: datetime

## Session

- id: string
- persona_id: string
- transcript: text
- duration_seconds: number
- objection_score: number
- confidence_score: number
- clarity_score: number
- improvement_summary: json
- created_at: datetime

---

# 7. AI Prompt Design

## Live Roleplay Prompt

You are a skeptical enterprise buyer evaluating a product.

Behavior Rules:

- Interrupt occasionally.
- Push for ROI proof.
- Raise pricing objections.
- If the rep avoids answering, repeat objection with stronger tone.
- Do not be easily convinced.
- Keep responses concise but challenging.

---

## Evaluation Prompt

You are a sales performance evaluator.

Given the transcript:

- Score objection handling (1-10)
- Score clarity (1-10)
- Score confidence (1-10)
- Identify missed opportunities
- Suggest 3 specific improvements

Return strictly valid JSON.

---

# 8. Future Roadmap (Post-MVP)

- Team dashboards
- Manager analytics
- Call replay
- AI comparison against top-performing reps
- Industry-specific training packs
- CRM integration
- Enterprise SSO
- Usage-based billing

---

# 9. Hackathon Demo Flow

1. Upload product description
2. Click "Generate Persona"
3. Start roleplay call
4. AI challenges aggressively
5. End call
6. Show structured scoring dashboard

Key demo moment:
AI interrupts and escalates objection pressure.

---

# 10. Success Criteria for MVP

- Real-time voice interaction works
- AI feels realistic and challenging
- Transcript captured correctly
- Scores are structured and meaningful
- Demo runs smoothly in under 5 minutes

---

# 11. Constraints

- Must use Gemini Live via @google/genai
- Must be written in TypeScript
- Backend must use Encore
- Keep UI minimal and professional
- Focus on performance over design

---

# 12. Positioning Statement

DealPilot is a real-time AI flight simulator for enterprise sales teams, designed to reduce ramp time and increase close rates through high-pressure objection training.
