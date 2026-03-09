import { GoogleGenAI } from "@google/genai";
import { GEMINI_TEXT_MODEL } from "@reptrainer/shared";
import { env } from "../config/env.js";
import { researchCompetitor } from "./vertex.js";
import {
  type GeneratePersonaRequest,
  type GeneratePersonaResponse,
  type EvaluateSessionRequest,
  type EvaluateSessionResponse,
  type GenerateProductRequest,
  type GenerateProductResponse,
  PROSPECT_PERSONALITY_TEMPLATES,
  type ProspectPersonalityTemplate,
  type CompetitorContext,
} from "@reptrainer/shared";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

/**
 * Extracts JSON from a potentially markdown-wrapped AI response.
 */
function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Generate a product profile using Gemini.
 */
export async function generateProduct(
  input: GenerateProductRequest,
): Promise<GenerateProductResponse> {
  const { companyName, briefDescription } = input;

  const prompt = `You are a product marketing and sales expert. Generate a detailed product profile for a sales training platform.
${briefDescription ? `- Context/Description: ${briefDescription}` : "- Context: [Generate a realistic, high-value B2B product/service profile]"}

Generate a product profile with the following JSON structure. Return ONLY valid JSON, no markdown:
{
  "companyName": "Generate a creative, professional, and memorable company name that fits the product description.",
  "description": "A concise, high-impact 2-3 sentence description of the product and its value proposition.",
  "targetCustomer": "A specific description of the ideal customer profile (e.g., 'Enterprise CTOs at fintech companies', 'SMB owners looking to automate marketing').",
  "industry": "A single, broad industry category (e.g., 'SaaS', 'Healthcare', 'Cybersecurity', 'Manufacturing', 'Logistics', 'Retail').",
  "objections": ["3-5 realistic sales objections this product typically faces"]
}

IMPORTANT:
- If company name/description are not provided, be creative but stay professional and realistic.
- DIVERSIFY the product types. While some can be AI-powered, ensure a healthy mix of traditional SaaS, hardware, professional services, and physical goods. Avoid defaulting to "AI-powered" for every generation.
- The objections should be challenging and specific to the product's likely friction points.`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
    config: { temperature: 1.0 },
  });

  const text = response.text ?? "";
  const jsonStr = extractJson(text);

  if (!jsonStr) {
    throw Object.assign(
      new Error("Failed to generate product. Invalid JSON response from AI."),
      { statusCode: 502 },
    );
  }

  return JSON.parse(jsonStr) as GenerateProductResponse;
}

/**
 * Generate a buyer persona using Gemini based on product context.
 */
export async function generatePersona(
  input: GeneratePersonaRequest,
): Promise<GeneratePersonaResponse> {
  const {
    companyName,
    description,
    targetCustomer,
    industry,
    objections,
    personalityType,
    gender: preferredGender,
    ethnicity,
    competitorUrl,
  } = input;

  let competitorContext: CompetitorContext | undefined;
  if (competitorUrl) {
    try {
      competitorContext = await researchCompetitor(competitorUrl);
    } catch (e) {
      console.error("Failed to research competitor:", e);
      // Continue without competitor context if research fails
    }
  }

  // Handle gender randomization if "other" is chosen
  const finalGender =
    preferredGender === "other"
      ? Math.random() > 0.5
        ? "male"
        : "female"
      : preferredGender;

  const template = personalityType
    ? (PROSPECT_PERSONALITY_TEMPLATES.find(
        (t) => t.type === personalityType,
      ) as ProspectPersonalityTemplate)
    : null;

  const personalityContext = template
    ? `
─── PERSONALITY TEMPLATE: ${template.name} ───
- Behavioral Profile: ${template.behavioralProfile}
- Tone: ${template.tone}
- Patience: ${template.patience}
- Verbosity: ${template.verbosity}
- Objection Likelihood: ${template.objectionLikelihood}
- Preferred Selling Points: ${template.preferredSellingPoints.join(", ")}
- Emotional Triggers: ${template.emotionalTriggers.join(", ")}
`
    : "";

  const prompt = `You are a sales training AI. Generate a realistic, challenging buyer persona for a high-pressure sales roleplay session.

Context:
- Company being pitched: ${companyName}
- Product: ${description}
- Target Customer: ${targetCustomer}
- Industry: ${industry}
- Common Objections: ${objections.join(", ")}${personalityContext}
${
  competitorContext
    ? `
─── CURRENT SOLUTION INFORMATION (COMPETITOR) ───
This persona currently uses: ${competitorContext.website}
Competitor Product: ${competitorContext.productDescription}
Pricing/Positioning: ${competitorContext.pricingPositioning}
Pain Points with Current Solution: ${competitorContext.painPoints.join(", ")}
Complaints: ${competitorContext.complaints.join(", ")}

The persona should be a current user of this competitor and should naturally reference it during the pitch.
`
    : ""
}
${finalGender ? `- Preferred Gender: ${finalGender}` : ""}
${ethnicity ? `- Preferred Ethnicity: ${ethnicity}` : ""}

Generate a buyer persona with the following JSON structure. Return ONLY valid JSON, no markdown:
{
  "name": "A realistic, memorable full name${finalGender ? ` for a ${finalGender} executive` : ""}${ethnicity ? ` from a ${ethnicity} background` : ""}. Use culturally diverse names. Examples: 'Priya Raghavan', 'Marcus Okonkwo', 'Elena Vasquez', 'James Whitfield', 'Aisha Patel', 'Tomoko Nakamura', 'David Kofi Mensah', 'Carolina Ferro'. The name should feel like a real executive you'd meet at a Fortune 500 company.",
  "role": "A specific, realistic job title (e.g., 'SVP of Revenue Operations', 'Chief Data Officer', 'Director of IT Infrastructure').",
  "gender": "${finalGender || '"male" or "female"'} (must match the name)",
  "companyType": "A realistic description of their company (e.g., 'Fortune 500 Fintech', 'Seed-stage AI startup', 'Mid-market manufacturing giant')",
  "industry": "${industry || "General Industry"}",
  "seniorityLevel": "e.g., Senior Executive, C-suite, VP-level decision maker",
  "personalityTraits": ["3-4 specific personality traits"],
  "personalityType": "${personalityType || "custom"}",
  "motivations": ["2-3 core business motivations for this person"],
  "objections": ["3-5 specific objections this person would raise during a pitch"],
  "traits": {
    "aggressiveness": "Number 1-10 reflecting how aggressive they are",
    "interruptionFrequency": "low, medium, or high",
    "objectionStyle": "analytical, emotional, authority-based, or budget-focused"
  },
  "speakingStyle": "Describe their verbal pattern (e.g., 'fast-paced and data-driven', 'slow, skeptical and deliberate')",
  "accent": "Specify a natural regional accent (e.g., 'British', 'New York', 'Indian', 'Neutral American')",
  "voiceName": "Choose one: ${finalGender === "male" ? "Charon, Fenrir, Puck" : finalGender === "female" ? "Aoede, Kore, Zephyr" : "Aoede, Charon, Fenrir, Kore, Puck"}",
  "communicationStyle": "professional",
  "emotionalState": "e.g., Skeptical, Busy, Curiously optimistic, Guarded",
  "environmentContext": "Where they are (e.g., noisy open office, quiet executive suite, airport lounge)",
  "timePressure": "e.g., 'Hurry, has 5 mins', 'Calm, has 30 mins but hates fluff'",
  "conversationBehavior": ["2-3 specific conversational patterns/habits"],
  "buyingAttitude": "e.g., Skeptical but open if high value, Tech-first early adopter, Highly price-sensitive",
  "difficultyLevel": "medium",
  "intensityLevel": 3,
  "patience": "medium",
  "verbosity": "medium",
  "personalityPrompt": "A detailed system prompt (5-8 sentences) describing how this persona behaves in sales meetings. ${template ? `IT MUST INCORPORATE THE BEHAVIORAL PROFILE, TONE, AND TRIGGERS FROM THE ${template.name} TEMPLATE.` : "Include communication style, skepticism triggers, pet peeves, and decision-making approach."}",
  "objectionStrategy": "A specific strategy this persona uses to push back (2-3 sentences). This MUST be dynamic and specific to the product context, not a generic statement.",
  "competitorContext": ${competitorContext ? JSON.stringify(competitorContext, null, 2) : "null"}
}

IMPORTANT:
- ${finalGender ? `The name and gender MUST be ${finalGender}.` : "Vary the gender across generations — create a realistic mix of male and female personas."}
- The name MUST clearly match the gender field.
- "intensityLevel" MUST be an integer between 1 and 5 (1=Friendly, 3=Tough, 5=Hostile).
- "objectionStrategy" MUST be unique and reflect the persona's specific role and the objections provided.
- "traits" object MUST be fully populated with realistic values matching the personality.
- Make the name MEMORABLE and DISTINCT — these are senior executives with presence.
- Vary cultural backgrounds. ${ethnicity ? `Prioritize the specified ethnicity (${ethnicity}) for the name and background.` : "Do NOT default to generic Anglo-Saxon names every time."}`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
    config: { temperature: 1.2 },
  });

  const text = response.text ?? "";
  const jsonStr = extractJson(text);

  if (!jsonStr) {
    throw Object.assign(
      new Error("Failed to generate persona. Invalid JSON response from AI."),
      { statusCode: 502 },
    );
  }

  return JSON.parse(jsonStr) as GeneratePersonaResponse;
}

/**
 * Evaluate a sales roleplay session transcript using Gemini.
 */
export async function evaluateSession(
  input: EvaluateSessionRequest,
): Promise<EvaluateSessionResponse> {
  const {
    transcript,
    personaName,
    personaRole,
    intensityLevel,
    durationSeconds,
  } = input;

  const prompt = `You are an expert sales performance evaluator and coach. Analyze the following sales roleplay transcript and provide a structured evaluation.

Persona Context:
- Buyer Name: ${personaName}
- Buyer Role: ${personaRole}
- Difficulty Level: ${intensityLevel}/5
- Call Duration: ${Math.round(durationSeconds / 60)} minutes

Transcript:
${transcript}

Evaluate the sales rep's performance on these 5 specific skills (Score 0-100):
1. **Discovery Questions**: Did the rep ask open-ended questions to uncover pain points, budget, and decision-making processes?
2. **Objection Handling**: Did the rep effectively acknowledge concerns and provide persuasive rebuttals to pushback?
3. **Product Positioning**: Did the rep align product features with the buyer's specifically mentioned needs and value drivers? 
4. **Closing**: Did the rep clearly define next steps or ask for the business at the appropriate time?
5. **Active Listening**: Did the rep demonstrate understanding by summarizing, mirroring, or reacting appropriately to the buyer's cues?

Also identify:
- 3-5 specific strengths (things the rep did well)
- 3-5 specific weaknesses (areas for improvement)
- 3-5 actionable improvement tips (specific, practical advice)
- An overall score (0-100) based on weighted performance.

**CRITICAL: Use the second person ("you") for all descriptions, strengths, weaknesses, and tips to address the rep directly.**

Return ONLY valid JSON in this exact format, no markdown:
{
  "discovery": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "objectionHandling": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "productPositioning": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "closing": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "activeListening": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "overallScore": <0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "improvementTips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
  });

  const text = response.text ?? "";
  const jsonStr = extractJson(text);

  if (!jsonStr) {
    throw Object.assign(
      new Error("Failed to evaluate session. Invalid JSON response from AI."),
      { statusCode: 502 },
    );
  }

  return JSON.parse(jsonStr) as EvaluateSessionResponse;
}
