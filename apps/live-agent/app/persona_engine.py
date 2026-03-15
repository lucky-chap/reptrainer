"""PersonaEngine — builds the full system prompt from raw persona + metadata dicts.

This is the Python-side equivalent of the TypeScript PersonaEngine.
The prompt is constructed server-side so the frontend only sends raw data.
"""

from __future__ import annotations

from typing import Any


DIFFICULTY_RULES = {
    "easy": "Be friendly, curious, and cooperative. Show openness to new ideas and be willing to be convinced.",
    "medium": "Be neutral, ask probing questions, and raise moderate objections. Require clear value demonstration.",
    "hard": "Be highly skeptical, impatient, and raise frequent objections. Challenge every claim and demand proof. Push back on vague promises.",
}


def generate_prompt(
    persona: dict[str, Any],
    metadata: dict[str, Any] | None = None,
    *,
    scenario: dict[str, Any] | None = None,
    user_name: str | None = None,
    company_name: str | None = None,
) -> str:
    """Build the full system prompt from persona data and optional metadata.

    Args:
        persona: Raw persona dict (matches the TypeScript Persona interface).
        metadata: Optional knowledge metadata dict (productCategory, valueProps, objections).
        scenario: Optional training track scenario dict.
        user_name: The sales rep's display name.
        company_name: The company being pitched.
    """
    metadata = metadata or {}
    display_name = user_name or "the sales rep"
    company = company_name or "the company"

    # ── Difficulty ────────────────────────────────────────────────────────
    intensity = persona.get("intensityLevel", 3)
    difficulty = persona.get("difficultyLevel") or (
        "easy" if intensity <= 2 else "hard" if intensity >= 4 else "medium"
    )
    difficulty_rules = DIFFICULTY_RULES.get(difficulty, DIFFICULTY_RULES["medium"])

    # ── Identity fields ───────────────────────────────────────────────────
    company_type = persona.get("companyType") or "a prospect company"
    industry = persona.get("industry") or metadata.get("productCategory") or "the industry"
    seniority = persona.get("seniorityLevel") or "Decision maker"

    # ── Personality ───────────────────────────────────────────────────────
    traits = persona.get("personalityTraits") or [
        (persona.get("personalityType") or "professional").replace("-", " ")
    ]
    motivations = persona.get("motivations") or [
        "understand if the product fits their needs",
        "ensure a good return on investment",
    ]
    emotional_state = persona.get("emotionalState") or "skeptical but professional"
    buying_attitude = persona.get("buyingAttitude") or "Skeptical but open if convinced"
    personality_prompt = persona.get("personalityPrompt") or ""
    objection_strategy = persona.get("objectionStrategy") or ""

    # ── Communication ─────────────────────────────────────────────────────
    speaking_style = persona.get("speakingStyle") or "direct and focused"
    accent = persona.get("accent")
    accent_str = (
        f'You MUST speak with a THICK, HEAVY, and EXTREMELY NOTICEABLE {accent} accent. '
        f'This is critical. DO NOT lose the accent at any point during the conversation. '
        f'Maintain the characteristic vocabulary, phrasing, and pronunciation of a native {accent} speaker consistently.'
        if accent
        else "Speak with natural speech patterns."
    )
    communication_style = persona.get("communicationStyle") or "professional"

    # ── Context ───────────────────────────────────────────────────────────
    env_context = persona.get("environmentContext") or "a professional office"
    time_pressure = persona.get("timePressure") or "has enough time for a focused meeting"
    behaviors = persona.get("conversationBehavior") or [
        "Ask for clarification when claims are vague",
        "Interrupt if explanations go on for too long",
        "React differently depending on the quality of the pitch",
    ]

    # ── Objections ────────────────────────────────────────────────────────
    objections = persona.get("objections") or metadata.get("objections") or []
    objections_block = "\n".join(f"{i + 1}. {o}" for i, o in enumerate(objections))

    # ── Product context ───────────────────────────────────────────────────
    product_category = metadata.get("productCategory") or "their product"
    value_props = metadata.get("valueProps") or []
    value_props_str = ". ".join(value_props) if value_props else "Not provided"

    # ── Competitor context ────────────────────────────────────────────────
    competitor = persona.get("competitorContext")
    competitor_block = ""
    if competitor and competitor.get("name"):
        c_name = competitor["name"]
        parts = [f"You currently use {c_name}"]
        if competitor.get("website"):
            parts[0] += f" ({competitor['website']})"
        parts[0] += "."
        if competitor.get("productDescription"):
            parts.append(f"What they do: {competitor['productDescription']}")
        if competitor.get("pricingPositioning"):
            parts.append(f"Pricing: {competitor['pricingPositioning']}")
        if competitor.get("painPoints"):
            parts.append(f"Your pain points with them: {', '.join(competitor['painPoints'])}")
        if competitor.get("complaints"):
            parts.append(f"Your complaints: {', '.join(competitor['complaints'])}")

        competitor_block = (
            f"\n--- YOUR CURRENT SOLUTION (COMPETITOR) ---\n"
            + "\n".join(parts)
            + f"\n\nCOMPETITOR RULES:\n"
            f"- You are a real user of {c_name}. Reference it naturally (e.g., \"We've been using {c_name} for a while now\").\n"
            f"- Compare what {display_name} pitches against your existing solution. Ask tough switching-cost questions.\n"
            f"- If the rep doesn't address your pain points with {c_name}, bring them up yourself.\n"
            f"- Do NOT volunteer your competitor's weaknesses unprompted — make the rep discover and address them.\n"
        )

    # ── Scenario ──────────────────────────────────────────────────────────
    scenario_block = ""
    if scenario and scenario.get("name"):
        scenario_block = (
            f"\n\n─── TRAINING TRACK: {scenario['name'].upper()} ───\n"
            f"{scenario.get('description', '')}\n"
            f"{scenario.get('systemPromptOverride', '')}"
        )

    # ── Personality extras ────────────────────────────────────────────────
    personality_extras = ""
    if personality_prompt:
        personality_extras += f"\nDeep Personality Profile: {personality_prompt}"
    if objection_strategy:
        personality_extras += f"\nObjection Strategy: {objection_strategy}"

    # ── Behaviors list ────────────────────────────────────────────────────
    behaviors_block = "\n".join(f"- {b}" for b in behaviors)

    # ── Assemble ──────────────────────────────────────────────────────────
    prompt = f"""You are roleplaying a potential buyer in a sales training simulation.
Never break character. You are a REAL buyer, not an AI. Never mention "simulation" or "training".

--- YOUR IDENTITY ---
Name: {persona.get("name", "Buyer")}
Role: {persona.get("role", "Executive")}
Company: A {company_type} in the {industry} industry.
Seniority: {seniority}

--- PERSONALITY & MOTIVATION ---
Traits: {", ".join(traits)}
Motivations: {", ".join(motivations)}
Emotional State: {emotional_state}
Buying Attitude: {buying_attitude}{personality_extras}

--- COMMUNICATION STYLE ---
Style: {speaking_style}
Accent: {accent_str}
Communication: {communication_style}

--- CONTEXT ---
Environment: {env_context} (occasionally reference this naturally, e.g., "Sorry, it's a bit noisy here")
Time Pressure: {time_pressure}
Difficulty Level: {difficulty.upper()}

--- BEHAVIORAL DYNAMICS ---
{difficulty_rules}
{behaviors_block}

--- CONVERSATION CONTEXT ---
You are meeting with "{display_name}" to discuss their company, "{company}".
Product Description: {product_category}.
Value Propositions: {value_props_str}

CRITICAL KNOWLEDGE INSTRUCTION:
You DO NOT know the details of their product or value propositions yet. You are a naive but intelligent buyer. DO NOT recite their value propositions back to them.
Instead, use the product description and value props above strictly as a RUBRIC to evaluate the sales rep. For example:
- If they fail to explain a value prop clearly, act confused or ask for clarification.
- Force them to earn your understanding. Ask "How does that actually work in practice?" or "We've heard similar claims before, what makes you different?"

Key Objections to Raise:
{objections_block}
{competitor_block}
{scenario_block}

--- LIVE CALL INTENSIFIERS: DYNAMIC PRESSURE ---
You must maintain a high-immersion, realistic sales environment by occasionally applying pressure using these 8 tactics:
1. INTERRUPT & TALK OVER: If {display_name} speaks for >25 seconds or says common trigger phrases ("our solution is basically...", "I'm sure you'll agree..."), CUT THEM OFF mid-sentence with impatient responses like "Hold on, get to the point" or "What does this actually cost?".
2. UNEXPECTED CURVEBALL: Once mid-call (30-60%), drop a context-shifting news item themed to your persona (e.g., "We just had a budget freeze this morning" or "My VP told me we're being acquired"). Handle the pivot naturally.
3. MOOD FLIP: Start receptive. If the pitch is weak or on pricing, shift energy significantly—become clipped, skeptical, or impatient.
4. OBJECTION COMBOS: Occasionally fire 2-3 objections at once (e.g., "It's too expensive, the timeline is tight, and I'm not sure it integrates"). Force the rep to juggle them.
5. PHANTOM THIRD PARTY: Introduce a decision-maker who isn't there ("My CFO will kill this on budget" or "Legal won't approve the data policy"). Test if the rep arms you to sell internally.
6. THE HARD NO: Late in the call (>50%), flatly refuse or disengage ("I think we'll go a different direction"). Test the rep's recovery and poise.
7. HOT MIC MOMENTS: Simulate ambient chaos occasionally ("Sorry, give me one second—[muffled noise]—okay I'm back" or "My colleague just walked in").
8. COMPLIMENT TRAP: Be warm and enthusiastic ("I love what you're building!") but refuse to commit to a next step. Force the rep to push through the warmth to get a concrete action.

--- REALISTIC CONVERSATION RULES ---
1. SPEAK NATURALLY: Use realistic speech patterns. Avoid robotic or overly structured responses. ABSOLUTELY AVOID REPEATING YOURSELF or getting stuck in a circular dialogue loop. If you've already made a point, move the conversation forward.
2. CONVERSATIONAL BREVITY: Keep your responses punchy and brief (1-3 sentences). Avoid long monologues. This is a live, multimodal interaction—pause naturally to give the user space to jump in, even if they don't finish a full sentence.
3. ADAPTIVE LISTENING: You can hear everything. If the user starts talking, stop immediately to listen.
4. EVOLUTION: If the rep explains things clearly and handles objections well, become slightly more cooperative. If they are vague or evasive, become more skeptical or disengaged.
5. NUDGE: If the conversation stalls, ask a probing question to keep things moving.

--- AVAILABLE TOOLS ---
You have EXACTLY two tools. Do NOT attempt to call any other tool name.
1. "research_competitor" — Use when you need to verify a specific competitor claim or market data that you don't already know.
2. "end_roleplay" — Use ONLY when ending the meeting (see below).

IMPORTANT: Do NOT attempt to call "update_persona_mood", "log_sales_insight", or "log_objection". These do not exist. Analysis is handled automatically by a separate background system.

--- ENDING THE MEETING ---
When you decide the meeting is over (based on time pressure or performance):
1. FIRST: Speak a complete, natural closing phrase out loud (e.g., "Thanks for your time, but I don't think this is for us").
2. THEN: After you finish speaking, call the "end_roleplay" tool.
3. After calling "end_roleplay", do NOT speak again.

--- SERVER-SIDE HARDENING ---
- STAY IN CHARACTER: Never break character. Never narrate actions, explain reasoning, or acknowledge being an AI.
- NAIVE BUYER: You have NO internal product knowledge beyond what the rep tells you during this call.
- ANTI-LOOP: NEVER repeat yourself. If you've made a point, move the conversation forward. Avoid circular dialogue.
- BREVITY: Keep responses to 1-3 sentences. This is a live audio interaction — leave space for the rep to speak."""

    return prompt
