# Hackathon Feature Ideas — AI Sales Rep Trainer

> Context: This app is an AI sales training platform where reps practice live voice calls against AI buyer personas. Built on Encore.ts + Gemini Live API.

---

## 🏆 TIER 1 — Mind-Blowing, High-Impact

### 1. Real-Time Body Language & Facial Expression Coach (Vision)

Use the Gemini Live API's **vision input** to capture the sales rep's webcam during the call. The AI simultaneously listens to audio AND watches their face/body, then overlays live coaching cues:

- "You broke eye contact when pricing came up — confidence signal"
- "You're nodding too much — appears eager/desperate"
- "Smile detected — great rapport moment"
  Post-call, generate a **highlight reel** of moments flagged as critical (e.g., when the rep flinched on price).

**Why it's judged well:** Breaks the text-box paradigm entirely. True multimodal (audio + vision + output coaching). Nobody has seen real-time facial coaching for sales training.

**Additional** you could also add screenshots to support coaching cues. so screenshots of the person, not the AI.

---

### 2. Live "Whisper Coach" — Real-Time Earpiece Coaching

While the rep is mid-conversation, a second Gemini session runs in the background analyzing the live transcript stream. It **whispers short tactical nudges** into a floating HUD overlay (not spoken aloud — a floating card on screen, or something better and subtle with great UX):

- _"They just said budget is tight — pivot to ROI, not features"_
- _"Objection: 'We already have a solution' — use the displacement framework"_
- _"They went quiet — ask an open question now"_

This simulates having a senior coach physically whispering in your ear during a live deal. After the call, show exactly which whispers were acted on vs. ignored and how that correlated with the score.

**Why it's judged well:** Novel UX paradigm. Real-time grounded guidance. Shows the AI as an active agent, not a passive evaluator.

---

### 3. AI-Generated Persona Video Avatar (Image/Video Generation)

When a buyer persona is generated (e.g., "Skeptical CFO — Margaret Chen"), use **Imagen/video generation** to create a realistic profile photo + animated avatar that appears on the "video call" screen. The avatar's mouth animates in sync with the AI's speech (using simple lip-sync or a looping talking animation triggered by `isAISpeaking`).

This transforms a voice call into a **full mock video sales call** — the rep sees a face, making it psychologically feel like a real meeting.

**Why it's judged well:** Stunning visual demo. Multimodal output. Judges will see an actual "video call" with an AI human — that's memorable.

---

### 4. Objection Heatmap — Visual Deal Autopsy

After the call, generate an interactive **heatmap/timeline visualization** of the transcript. Each moment is color-coded:

- 🔴 Red = objection raised, rep fumbled
- 🟡 Yellow = objection raised, neutral response
- 🟢 Green = objection raised, excellent handling
- 🔵 Blue = rapport/discovery moment

Clicking any segment replays the exact audio clip from that moment. The AI then shows an alternative script: _"Here's how a top performer would have responded at 2:14..."_ and **speaks it aloud** using text-to-speech.

**Why it's judged well:** Combines multimodal output (visual + audio replay + generated ideal response). Makes the evaluation screen genuinely useful, not just a scorecard.

---

## 🥈 TIER 2 — Strong Differentiators

### 5. Product Pitch Upload → Instant Objection Stress Test

Let the rep upload their **actual pitch deck (PDF/images)**. Gemini Vision analyzes each slide and automatically generates persona-specific objections based on what's visually present:

- Slide shows a price point → generates pricing pressure objections
- Slide shows a competitor comparison → generates "why not just use X?" objections
- Slide shows customer logos → "Are any of those in our industry?"

The personas are then pre-loaded with these slide-aware objections, making the roleplay hyper-realistic.

**Why it's judged well:** Multimodal input (vision reading pitch decks). Shows grounding — objections are derived from real content, not hallucinated.

---

### 6. Leaderboard + Coaching Progression Dashboard

Track rep performance across multiple sessions over time. Show:

- Score trends per skill (objection handling, confidence, clarity)
- "Weak spot" identification: which objection type consistently trips them up
- **AI-generated personalized training plan**: "You struggle with price objections. Here are 3 scenarios to practice this week."
- Team leaderboard for sales managers to track their reps

**Why it's judged well:** Turns a demo into a real product. Shows depth of agent architecture.

---

### 7. "Nightmare Mode" — Dynamic Persona Escalation

The AI persona adapts its difficulty in real-time based on how well the rep is doing:

- Rep handles pricing objection smoothly → persona escalates to a harder follow-up attack
- Rep stumbles → persona doubles down with more pressure
- Rep goes off-script → persona introduces a surprise new stakeholder ("Actually, let me loop in our legal team...")

Uses the Gemini Live API's real-time context awareness. The system prompt is dynamically updated mid-call based on a scoring signal computed from the transcript stream.

**Why it's judged well:** Demonstrates true agent intelligence (not scripted). Context-aware and live. Directly hits the "Is the experience Live and context-aware?" judging criterion.

---

### 8. Screen Share Analysis Mode

Rep can share their screen (a CRM, a proposal doc, a pricing sheet). Gemini Vision watches what's on screen while the call happens and gives the persona awareness of it:

- Rep shares a pricing doc → persona immediately reacts: "I can see you're showing me $50k — that's way over budget"
- Rep pulls up a case study → persona engages with the specific customer name visible

**Why it's judged well:** Novel, surprising UX. True multimodal integration (screen vision + audio + voice output). Feels like magic.

---

## 🥉 TIER 3 — Polish & Presentation Wins

### 9. Call Recording + Shareable Report Card

Auto-generate a shareable PDF/link after each session containing:

- Audio recording with transcript
- Score breakdown with benchmark comparisons
- The "whisper coach" moments that were triggered
- Top 3 improvement clips with AI-generated ideal responses

Reps can share with managers. Managers can annotate and send back.

---

### 10. Multi-Language Persona Support

Generate personas that speak in different languages or with different cultural negotiation styles (e.g., "German enterprise buyer — very direct, hates fluff" vs. "Japanese enterprise buyer — consensus-driven, indirect rejection signals"). The Gemini Live API handles real-time multilingual voice.

Expands the TAM massively and is visually impressive in a demo.

---

## Implementation Priority Order

For maximum hackathon impact, implement in this order:

1. **Persona Video Avatar** (#3) — Visual wow factor, demo-able in 30 seconds
2. **Live Whisper Coach** (#2) — Core innovation, directly hits Live Agent criteria
3. **Objection Heatmap with Audio Replay** (#4) — Elevates the existing results page dramatically
4. **Real-Time Body Language Coach** (#1) — Technically complex but the highest ceiling
5. **Nightmare Mode** (#7) — Relatively easy to implement, high perceived intelligence

---

## Architecture Notes for Judges

- **Gemini Live API**: Used for real-time bidirectional audio streaming (already implemented)
- **Gemini Vision**: Add for webcam/screen analysis running as a parallel session
- **Imagen**: Buyer persona avatar generation
- **Encore.ts on Google Cloud**: Backend services for session management, evaluation, streaming
- **Grounding**: Objections derived from actual product docs/pitch decks (not hallucinated)
- **Error Handling**: Graceful degradation if vision stream drops, whisper coach falls back to post-turn analysis
