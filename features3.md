# Features3 — Live Call Experience Intensifiers

> Focus: Making the roleplay call itself more immersive, pressured, dynamic, and emotionally real. These features live _inside_ the call, not in analytics dashboards.

---

## 1. Interrupt & Talk Over — Real Human Rudeness

The AI persona interrupts the rep mid-sentence at key moments — just like a real impatient buyer would. If the rep has been talking for more than 25 seconds straight, or if they say a trigger phrase ("our solution is basically..."), the persona cuts in:

- _"Yeah yeah — what does it actually cost?"_
- _"Hold on — I'm going to stop you there."_
- _"Sorry, I have 10 minutes. Get to the point."_

The rep has to gracefully manage being interrupted, yield the floor, then reclaim it. A small "Interrupted" badge appears in the transcript at that moment. Post-call, the rep sees how many times they got steamrolled and whether they recovered.

**Why it hits different:** Every real sales call has this. It's never in training tools. The first time the AI cuts you off mid-pitch, you physically feel it.

---

## 2. The Clock — Fake Hard Meeting Timer

A visible countdown timer in the top corner of the call: **"Meeting ends in 12:00."** It counts down in real time.

If the rep hasn't asked about budget by the 8-minute mark, a soft pulse appears on the timer. If they hit 2 minutes remaining without a clear next step committed, the persona says:

- _"I'm going to have to jump to my next meeting in a sec — where are we landing?"_

When the clock hits 0:00, the persona ends the call cold: _"I've got to run — send me something in writing."_

The rep learns time pressure management. Every second of small talk has a cost they can see.

---

## 3. Unexpected Curveball — Mid-Call Reality Drops

At a random point 30–60% through the call, the persona drops a completely unexpected piece of news that changes the context:

- _"Actually, I should tell you — we just had a budget freeze this morning."_
- _"Between us, my VP just told me we're being acquired. So this decision is on hold."_
- _"Full transparency — your competitor already sent us a proposal yesterday."_

The rep has to adapt live. There's no script for this. The curveball is generated fresh each session by Gemini, themed to the product and persona. Post-call, it's tagged in the transcript as a "Live Curveball" moment with a score for how well the rep pivoted.

---

## 4. The Long Pause — Weaponized Silence

After the rep finishes a critical answer (e.g., pricing question, closing ask), the AI deliberately says nothing for 4–6 seconds. Just silence.

Most reps will crack and start talking again, undercutting their own position. If the rep fills the silence within 4 seconds, a subtle "You broke first" flag appears in the transcript.

If they hold the silence, the persona eventually responds positively: _"...Okay. Walk me through the implementation timeline."_

This trains one of the most powerful and hardest sales skills — shutting up after the close.

---

## 5. Voice Crack Detector — Confidence in Real Time

Using the audio stream already flowing through `start.ts`, run a lightweight analysis pass after each rep turn that flags:

- Trailing off at the end of sentences (losing conviction)
- Rising intonation on statements (turning facts into questions)
- Filler words: "um," "uh," "like," "sort of," "kind of," "I think"
- Hedge phrases: "I believe," "I'm pretty sure," "that might be"

A small **live badge** pulses below the mic button in real time: `"Strong"` / `"Hedging"` / `"Trailing"`. It fades after 3 seconds so it doesn't distract — just a quick flash of self-awareness.

The rep builds a habit of catching their own vocal weakness _while_ they're speaking, not in post-call review.

---

## 6. Persona Mood Flip — They Were Warm, Then They Weren't

The persona starts the call in a noticeably receptive mood — curious, engaged, asking questions. Then, at a specific trigger (usually a pricing discussion or a weak answer to "why should I switch?"), the energy drops completely:

- Shorter responses
- More clipped tone
- _"I've heard this before."_
- _"Let's say I'm skeptical."_

The rep has to detect the shift and actively work to win the energy back. This is not communicated explicitly — no badge, no meter. The rep has to _feel_ it and respond to it, just like a real call.

Post-call, the exact transcript moment where the flip occurred is highlighted in yellow: **"Mood Shift Point."**

---

## 7. Objection Combos — They Never Come One at a Time

Instead of objections arriving cleanly one at a time, the persona fires **stacked objections** — two or three at once:

- _"It's too expensive, the timeline doesn't work for us, and frankly I'm not sure this integrates with our stack."_

The rep has to choose which to address first, which to defer, and how to hold all three without fumbling. Post-call, the transcript shows which parts of the combo were addressed and which were left dangling (and whether the persona exploited the unaddressed objection later).

This is how real buyers talk. Handling stacked objections is a skill that almost no training tool specifically targets.

---

## 8. Phantom Third Party — "My Boss Will Never Approve This"

At a key moment, the persona introduces a decision-maker who isn't in the room:

- _"Look, even if I like it, my CFO will kill this on budget alone."_
- _"My co-founder is extremely skeptical of new vendors after our last experience."_
- _"Legal is going to have a field day with your data policy."_

The rep now has to sell to a person they can't talk to. They have to arm the persona to become their internal champion — giving them language, ammunition, and frameworks to sell on their behalf.

Post-call: a "Phantom Stakeholder Score" — did the rep equip the buyer with what they need to sell internally? Gemini evaluates whether the rep provided clear, quotable, champion-ready soundbites.

---

## 9. The Hard No — Learning to Lose Gracefully

Once per session (at a randomly chosen moment after the 50% mark), the persona flat-out says no and starts to disengage:

- _"Honestly, I think we're going to go a different direction."_
- _"I don't think the timing is right for us."_

The rep's job is not to panic, argue, or discount — but to execute a graceful save: asking what changed, proposing a future touchpoint, leaving the door open without desperation.

If the rep immediately offers a discount, a "Panic Discount" flag fires. If they hold their ground and ask the right question, the persona re-engages.

This trains losing with dignity — one of the most undertrained skills in sales.

---

## 10. Hot Mic Moments — Ambient Call Chaos

The persona occasionally references ambient sounds or interruptions on their "end" of the call — creating the feeling of a real video meeting:

- _"Sorry, give me one second — [muffled] — okay I'm back."_
- _"I'm going to mute myself for a moment."_ (3-second silence, then returns)
- _"My colleague just walked in — can you give me the 30-second version of what you just said?"_

The rep has to adapt to conversational chaos: re-summarizing, holding patience, re-engaging after breaks. These micro-moments train the "glue" skills that hold a real call together.

**Technical hook:** These are injected as pre-scripted AI-turn lines that Gemini delivers verbatim at randomized intervals, defined in the persona system prompt as timed event triggers.

---

## 11. The Compliment Trap — Validation Without Commitment

The persona is warm, engaged, enthusiastic — but never commits:

- _"This is really impressive, honestly."_
- _"I love what you're building."_
- _"I'm definitely going to share this with the team."_

No objections. Just enthusiasm with zero forward motion. The rep has to push through the warmth and extract a concrete next step — a date, a decision, a meeting with stakeholders. If they leave the call without a committed action, they score low even though the vibe felt great.

This trains reps to distinguish between a prospect who likes you and a prospect who will actually buy — one of the hardest distinctions in sales.

---

## Implementation Notes

All 11 features operate entirely within the live call loop:

- Features **1, 3, 6, 7, 8, 9, 10, 11** are system prompt + AI behavior changes — no backend changes required
- Feature **2** (timer) is pure frontend — a countdown component on the `Roleplay` page
- Feature **4** (silence) is a Gemini behavior instruction + frontend silence detection via the audio stream
- Feature **5** (voice crack) fires as a lightweight async Gemini call after each `transcript` event, same pattern as the mood meter in features2.md

Highest demo impact per hour: **#2, #4, #7, #9** — all visceral, all immediately felt by anyone watching.
