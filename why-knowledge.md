The reason competitor search should happen **during knowledge base setup instead of the live API call** comes down to **three important things: realism, system stability, and training quality**.

I'll break it down simply.

---

# 1. Realism: Buyers already researched competitors before the call

In real sales meetings, buyers don't usually discover competitors **during the meeting**. They already researched them beforehand.

Real flow:

```
Research → Schedule meeting → Ask questions
```

Example:

Before the meeting the buyer already knows:

- SalesBoost
- PitchFlow
- RepTrainer

So during the call they say things like:

> “We’re also looking at SalesBoost. How are you different?”

That means the **buyer persona already has competitor knowledge** when the call starts.

If your AI searches competitors **live**, it behaves like someone who didn't prepare for the meeting, which feels less realistic.

---

# 2. Stability: Live search makes scenarios inconsistent

If competitor search happens during the live call, each simulation might discover **different competitors**.

Example:

**Rep A's call**

```
Competitors discovered:
- SalesBoost
- PitchFlow
```

**Rep B's call**

```
Competitors discovered:
- CloseCRM
- Gong
```

Now the training environment becomes unpredictable.

But training works best when the **scenario is consistent**.

When you generate competitors during knowledge base setup, every rep trains against the **same market context**.

---

# 3. Latency: Live search slows the conversation

A live conversation should feel **instant and natural**.

If the AI must:

```
1. Decide to search
2. Call Google tool
3. Wait for results
4. Process results
5. Continue speaking
```

That adds delay.

In voice conversations (like Gemini Live), even **1–2 seconds** feels awkward.

When the data is already in the knowledge base:

```
RAG retrieval → immediate response
```

The conversation stays smooth.

---

# 4. Cost: Live search increases API usage

If every call performs multiple searches, your system does:

```
Google search
+
RAG retrieval
+
LLM generation
```

But if competitor data is generated once during knowledge base setup, you only pay for it **once**, not during every simulation.

---

# 5. Better training structure

When competitor data is generated during knowledge base setup, it becomes part of the **training scenario**.

Example stored in the knowledge base:

```
Market Context

Competitors
- SalesBoost
- PitchFlow

SalesBoost strengths
- CRM integration
- Enterprise adoption

SalesBoost weaknesses
- Expensive
- Complex onboarding
```

Then the AI persona can ask realistic objections like:

> “SalesBoost integrates with Salesforce. Do you offer something similar?”

This creates **consistent, repeatable training scenarios**.

---

# 6. Knowledge base also helps coaching later

Because competitor data is stored, the system can later evaluate the rep.

Example:

Rep says:

```
"Our main advantage is price."
```

Knowledge base says:

```
Key differentiator = simulation-based training
```

The AI coach can say:

> “You missed the main differentiation from SalesBoost.”

That only works if the competitor data is **structured and stored beforehand**.

---

# 7. Clean architecture

Best architecture for your app:

### Step 1 — Knowledge Base Setup

```
Google Search
↓
Extract competitors
↓
Structure the data
↓
Store in RAG
```

---

### Step 2 — Live Call

```
Gemini Live
↓
Retrieve competitor info from RAG
↓
Generate objections/questions
```

---

### Step 3 — Post-call Coaching

```
Compare rep responses
against
knowledge base facts
```

---

# 8. When live search _does_ make sense

Live search can still be useful for **rare cases**, like:

- very specific technical questions
- pricing updates
- obscure integrations

But it should be **optional**, not the main system.

---

✅ **In simple terms**

Competitor search should happen during **knowledge base setup** because:

1. Buyers already research competitors before meetings.
2. Training scenarios stay consistent.
3. Live conversations remain fast.
4. API costs stay lower.
5. Coaching becomes more accurate.

---

If you want, I can also show you a **really powerful design pattern used by AI training platforms** that would make your personas **much smarter without increasing latency**.
