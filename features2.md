# Features2 — Next-Level Hackathon Ideas

> Deeper cuts. Each one is implementable in this codebase within the hackathon window and designed to be a jaw-dropper in a 3-minute demo.

---

## 1. "What If" Replay — Rewind and Try Again

After a call ends, the user picks any moment in the transcript where they fumbled and hits **"Rewind to here."** The system:

1. Strips the transcript back to that exact point
2. Re-hydrates the Gemini Live session with the truncated context as conversation history
3. Drops the user back into a live voice call from that exact moment

This is the sales equivalent of a flight simulator re-running the crash scenario. No other sales training tool on earth does this. The rep practices the same objection repeatedly until they nail it — then the AI continues the call forward from that better response.

**Technical hook:** On session end, store the full transcript segments with timestamps in the DB. `startRoleplay` gains an optional `rewindFromTurn` param that pre-populates Gemini's `history` field before streaming begins.

---

## 2. "Emotional State" Live Meter

A real-time sidebar gauge showing the **AI buyer's emotional state** on 4 axes, updated every turn:

- **Trust** (0–100)
- **Interest** (0–100)
- **Frustration** (0–100)
- **Deal Likelihood** (0–100%)

Each time the AI responds, a lightweight Gemini flash call runs on just the last 2 turns and returns a JSON delta for the meters. The bars animate live. When Trust hits 0, the persona starts shutting down. When Deal Likelihood crosses 70%, a subtle golden glow pulses on the screen.

This makes invisible emotional dynamics visible — reps learn to _read_ the room from the meter, which trains them to read it on real calls.

**Technical hook:** A second lightweight non-streaming Gemini call fires after each `transcript` event in `start.ts`. Result is sent as a new `mood` message type on the existing WebSocket stream.

---

## 3. Instant AI Competitor — Upload Your Rival's Pricing Page

In the product setup step, add a URL field: "Paste your top competitor's website URL." Gemini fetches and reads it, then automatically:

- Extracts their pricing, positioning, and key claims
- Injects that knowledge into the buyer persona's system prompt
- Makes the buyer say things like: _"Your competitor AcmeCorp does this for $30k less — why should I pick you?"_

The rep now has to defend their product against real, grounded competitive attacks — not hallucinated ones. In the demo, show yourself pasting a real competitor URL and watching the persona immediately know specific pricing tiers.

**Technical hook:** In `generate.ts`, before persona generation, call `ai.models.generateContent` with the competitor URL fetched via the Gemini URL context feature. Prepend the extracted intel to the persona system prompt.

---

## 4. Voice Tone Analysis — Your Nervous System Is Showing

While audio streams in `start.ts`, run parallel audio feature extraction on the raw PCM data. After each rep turn, send metrics to a `toneAnalysis` Gemini call that infers:

- **Pace** (speaking too fast under pressure?)
- **Filler words** (um, uh, like, you know — counted from transcript)
- **Sentence confidence score** (did they trail off? hedge with "I think maybe"?)
- **Power words used** (guarantee, proven, specifically, because)

Display these as a post-turn card that fades in after the rep finishes speaking. At the end, generate a "Vocal Confidence Report" — which moments their voice broke, which objection caused the most filler words.

**Why it's mindblowing:** The rep watches themselves speak confidently about features then statistically collapse when price is mentioned. That moment of self-awareness is visceral.

---

## 5. Multi-Stakeholder Ambush

Mid-call, the AI buyer says: _"Hold on, I'm going to bring in our Head of Engineering for a second."_ A **second AI voice** joins the call — different voice (switch to `Puck` or `Charon` voice), different personality, different set of objections.

The rep suddenly has to handle two stakeholders simultaneously: the CFO pushing back on price while the CTO drills into integrations. The transcript labels each speaker differently. The evaluation scores them on how well they managed multiple stakeholders.

**Technical hook:** `startRoleplay` spawns a second `geminiSession` with a different system prompt and voice config. A orchestrator layer decides which session to route the user's audio to based on which persona last spoke, and interleaves their responses.

---

## 6. The "Silent Partner" — AI That Plays Dumb Until You Earn It

A completely new persona archetype: **The Gatekeeper**. This buyer starts with one sentence answers, no engagement, near-total stonewalling. The entire challenge is to break through the wall and get them talking.

What makes it mindblowing: the persona's system prompt instructs it to track an internal "engagement score." Once the rep asks 3 genuinely good discovery questions (scored internally by the AI), the persona "warms up" and becomes a real conversation. The rep has to _earn_ the conversation.

Post-call, the transcript is annotated to show exactly which question cracked the door open — highlighted in green with a "Discovery Moment" badge.

---

## 7. Deal Room — Real-Time Collaborative Coaching for Teams

Instead of solo training, the session has two roles:

- **The Rep** — in the call, talking to the AI buyer
- **The Coach** (manager joins via a shareable link) — watches the live transcript in real time, can type whisper messages that appear as floating cues only the rep sees, and can hit a **"Take Over"** button to demo the right response live

After the call, the coach records a Loom-style audio annotation at specific transcript points: _"At 3:42, here's how I would have responded..."_ The rep can replay these coaching annotations with the original transcript.

**Technical hook:** A new `coaching` Encore service with a Pub/Sub topic. Coach sends messages to topic; rep's frontend subscribes via a streaming endpoint. The "take over" swaps which microphone input is sent to Gemini.

---

## 8. AI-Scored Practice Prompt Library → Auto-Generated Drills

After 3+ sessions, Gemini analyzes all transcripts and identifies the rep's specific weak pattern (e.g., they always capitulate on price after 2 pushbacks). It auto-generates:

- A 60-second targeted drill: just the objection they keep losing, looped 5 times with random variations
- A "flash card" mode: persona fires a single objection, rep has 20 seconds to respond, immediately scored, next objection
- A "speed round" mode: 10 objections in 5 minutes, pure reps

The drills are AI-generated specifically from their failure patterns — like a personal trainer designing workouts around your weak muscle groups.

---

## 9. Live Internet Grounding — Persona That Reads Today's News

The AI buyer knows current events relevant to your industry. Before the call starts, Gemini (with Google Search grounding enabled) fetches:

- Recent news about the company or industry the persona represents
- Current market conditions, interest rates, layoffs, funding news
- Any recent controversy or competitor news

The buyer says things like: _"I saw your competitor just raised $50M — does that make you nervous about competing with their resources?"_ or _"Given the current macro environment, we're extremely capital-conservative right now."_

This makes the simulation feel like a real meeting that's happening today, not a canned script.

**Technical hook:** Enable `google_search` tool in the Gemini content generation call that creates the persona system prompt. Let it ground the persona's context in real search results.

---

## 10. The "Deal Killer" Alert System

During the call, a background analysis pass (every 3 rep turns) checks if the rep has committed any of 10 classic fatal mistakes:

- Discounting before being asked
- Mentioning a competitor unprompted
- Using "honestly" or "to be transparent" (signals prior dishonesty)
- Talking more than 70% of the time (not enough listening)
- Saying "I'll have to check on that" more than twice
- Never asking a discovery question
- Agreeing with objections instead of reframing them

When a deal killer is detected, a **red alert card** briefly flashes on the HUD: _"DEAL KILLER: You just offered a 20% discount unprompted. Never discount before the ask."_

It's jarring and memorable — reps remember the moment they got flagged.

---

## Implementation Stack Notes

All 10 features are achievable with:

- Existing Gemini Live API stream in `backend/roleplay/start.ts`
- New message types on the existing WebSocket (just add to `OutgoingMessage` union)
- New lightweight Gemini flash calls firing as async side-effects inside the stream handler
- Encore Pub/Sub for the Deal Room coaching feature (#7)
- Google Search grounding on persona generation for feature #9

The features that require zero backend changes and are pure frontend wins: **#2 meter UI**, **#6 new persona type** (just a new entry in `PERSONA_TYPES`), and **#10 alert UI**.

Highest demo impact per hour of build time: **#2, #9, #10, #5** in that order.
