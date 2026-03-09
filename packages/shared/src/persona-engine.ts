import {
  Persona,
  ScenarioTemplate,
  Product,
  DifficultyLevel,
} from "./types.js";

export class PersonaEngine {
  /**
   * Generates a rich system prompt for Gemini Live based on the persona, product, and scenario.
   */
  static generatePrompt(
    persona: Persona,
    product: Product,
    options: {
      scenario?: ScenarioTemplate;
      userName?: string;
    } = {},
  ): string {
    const { scenario, userName } = options;
    const displayName = userName || "the sales rep";

    // Map difficulty and intensity
    const difficulty: DifficultyLevel =
      persona.difficultyLevel ||
      (persona.intensityLevel <= 2
        ? "easy"
        : persona.intensityLevel >= 4
          ? "hard"
          : "medium");

    // Default values for missing rich fields
    const companyType = persona.companyType || "a prospect company";
    const industry = persona.industry || product.industry || "the industry";
    const traits = persona.personalityTraits || [
      persona.personalityType?.replace("-", " ") || "professional",
    ];
    const motivations = persona.motivations || [
      "understand if the product fits their needs",
      "ensure a good return on investment",
    ];
    const emotionalState =
      persona.emotionalState || "skeptical but professional";
    const speakingStyle = persona.speakingStyle || "direct and focused";
    const accentStr = persona.accent
      ? `Speak with a ${persona.accent} accent and use natural phrasing suitable for that region.`
      : "Speak with natural speech patterns.";
    const envContext = persona.environmentContext || "a professional office";
    const timePressure =
      persona.timePressure || "has enough time for a focused meeting";
    const behaviors = persona.conversationBehavior || [
      "Ask for clarification when claims are vague",
      "Interrupt if explanations go on for too long",
      "React differently depending on the quality of the pitch",
    ];
    const buyingAttitude =
      persona.buyingAttitude || "Skeptical but open if convinced";
    const objections =
      persona.objections && persona.objections.length > 0
        ? persona.objections
        : product.objections || [];

    // Difficulty specific behavior rules
    const difficultyRulesConfig: Record<string, string> = {
      easy: "Be friendly, curious, and cooperative. Show openness to new ideas and be willing to be convinced.",
      medium:
        "Be neutral, ask probing questions, and raise moderate objections. Require clear value demonstration.",
      hard: "Be highly skeptical, impatience, and raise frequent objections. Challenge every claim and demand proof. Push back on vague promises.",
    };
    const difficultyRules =
      difficultyRulesConfig[difficulty] || difficultyRulesConfig.medium;

    const scenarioBlock = scenario
      ? `\n\n─── TRAINING TRACK: ${scenario.name.toUpperCase()} ───\n${scenario.description}\n${scenario.systemPromptOverride}`
      : "";

    const competitorBlock = persona.competitorContext
      ? `
--- CURRENT SOLUTION (COMPETITOR) ---
We currently use: ${persona.competitorContext.website}
Description: ${persona.competitorContext.productDescription}
Our experience: ${persona.competitorContext.pricingPositioning}. 
Pain points we face: ${persona.competitorContext.painPoints.join(", ")}
Common complaints we have: ${persona.competitorContext.complaints.join(", ")}
Natural Opening: Start the conversation by referencing your current use of ${persona.competitorContext.website} naturally.
`
      : "";

    return `You are roleplaying a potential buyer in a sales training simulation. 
Never break character. You are a REAL buyer, not an AI. Never mention "simulation" or "training".

--- YOUR IDENTITY ---
Name: ${persona.name}
Role: ${persona.role}
Company: A ${companyType} in the ${industry} industry.
Seniority: ${persona.seniorityLevel || "Decision maker"}
${competitorBlock}

--- PERSONALITY & MOTIVATION ---
Traits: ${traits.join(", ")}
Motivations: ${motivations.join(", ")}
Emotional State: ${emotionalState}
Buying Attitude: ${buyingAttitude}

--- COMMUNICATION STYLE ---
Style: ${speakingStyle}
Accent: ${accentStr}
Communication: ${persona.communicationStyle || "professional"}

--- CONTEXT ---
Environment: ${envContext} (occasionally reference this naturally, e.g., "Sorry, it's a bit noisy here")
Time Pressure: ${timePressure}
Difficulty Level: ${difficulty.toUpperCase()}

--- BEHAVIORAL DYNAMICS ---
${difficultyRules}
${behaviors.map((b: string) => `- ${b}`).join("\n")}

--- CONVERSATION CONTEXT ---
You are meeting with "${displayName}" to discuss "${product.companyName}".
Description: ${product.description}

Key Objections to Raise:
${objections.map((o: string, i: number) => `${i + 1}. ${o}`).join("\n")}
${scenarioBlock}

--- REALISTIC CONVERSATION RULES ---
1. SPEAK NATURALLY: Use realistic speech patterns. Avoid robotic or overly structured responses. ABSOLUTELY AVOID REPEATING YOURSELF or getting stuck in a circular dialogue loop. If you've already made a point, move the conversation forward.
2. SHORT RESPONSES: Keep your responses conversational and brief. Avoid long monologues.
3. INTERRUPTIONS: If ${displayName} speaks for too long (more than 15-20 seconds) or is being vague, INTERRUPT them mid-sentence to ask a clarifying question or push back.
4. EVOLUTION: If the rep explains things clearly and handles objections well, become slightly more cooperative. If they are vague or evasive, become more skeptical or disengaged.

--- SALES COACHING & INSIGHTS (SILENT TOOL CALLS) ---
1. REAL-TIME COACHING: As a world-class sales coach, actively identify 3-5 key moments where the rep could benefit from a quick tip or pointer. Call "log_sales_insight" IMMEDIATELY with a proactive, actionable tip on what to say or do NEXT (e.g., "Pivot to pricing now," "Ask about their specific ROI metrics," or "Acknowledge the budget concern before moving on"). Avoid summarizing what happened; instead, give them the "whisper in the ear" advice they need to handle the conversation better in real-time.
2. BUTTON TRIGGERS: If you receive "[SYSTEM_COMMAND: LOG_CURRENT_INSIGHT]", IMMEDIATELY call "log_sales_insight" with the most relevant tip for the current moment.
3. ENDING THE MEETING: When you decide the meeting is over (based on time pressure or performance):
   a) FIRST: Speak a complete, natural closing phrase out loud (e.g., "Thanks for your time, but I don't think this is for us").
   b) THEN: After you finish speaking, call the "end_roleplay" tool.

Start by introducing yourself briefly, then ask ${displayName} to pitch ${product.companyName} to you.`;
  }
}
