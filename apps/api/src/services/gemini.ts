import { GoogleGenAI } from "@google/genai";
import { GEMINI_TEXT_MODEL } from "@reptrainer/shared/src";
import { env } from "../config/env.js";
import type {
  GeneratePersonaRequest,
  GeneratePersonaResponse,
  EvaluateSessionRequest,
  EvaluateSessionResponse,
} from "@reptrainer/shared/src";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

/**
 * Extracts JSON from a potentially markdown-wrapped AI response.
 */
function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Generate a buyer persona using Gemini based on product context.
 */
export async function generatePersona(
  input: GeneratePersonaRequest
): Promise<GeneratePersonaResponse> {
  const { companyName, description, targetCustomer, industry, objections } =
    input;

  const prompt = `You are a sales training AI. Generate a realistic, challenging buyer persona for a high-pressure sales roleplay session.

Context:
- Company being pitched: ${companyName}
- Product: ${description}
- Target Customer: ${targetCustomer}
- Industry: ${industry}
- Common Objections: ${objections.join(", ")}

Generate a buyer persona with the following JSON structure. Return ONLY valid JSON, no markdown:
{
  "name": "A realistic, memorable full name. Use culturally diverse names — mix ethnicities and backgrounds. Examples: 'Priya Raghavan', 'Marcus Okonkwo', 'Elena Vasquez', 'James Whitfield', 'Aisha Patel', 'Tomoko Nakamura', 'David Kofi Mensah', 'Carolina Ferro'. Avoid generic names like 'John Smith' or 'Jane Doe'. The name should feel like a real executive you'd meet at a Fortune 500 company.",
  "role": "A specific, realistic job title (e.g., 'SVP of Revenue Operations', 'Chief Data Officer', 'Director of IT Infrastructure'). Avoid generic titles like 'Manager'.",
  "gender": "male" or "female" (must match the name),
  "personalityPrompt": "A detailed system prompt (5-8 sentences) describing how this persona behaves in sales meetings. Include: their communication style (direct, analytical, impatient, etc.), what triggers their skepticism, specific pet peeves in sales pitches (e.g., 'hates buzzwords', 'demands ROI before features'), their decision-making approach (consensus-driven, data-driven, gut-feel), and what would make them end a meeting early. Make the persona feel like a real, specific person with strong opinions.",
  "intensityLevel": 1-3 (1=friendly skeptic, 2=tough negotiator, 3=hostile gatekeeper),
  "objectionStrategy": "A specific 2-3 sentence strategy this persona uses to push back. E.g., 'Opens with budget concerns, then escalates to questioning whether the product solves a real problem. Will demand competitive comparisons and walk if the rep can't provide them.'",
  "traits": {
    "aggressiveness": 1-3,
    "interruptionFrequency": "low" | "medium" | "high",
    "objectionStyle": "analytical" | "emotional" | "authority-based" | "budget-focused"
  }
}

IMPORTANT:
- Vary the gender across generations — create a realistic mix of male and female personas.
- The name MUST clearly match the gender field.
- Make the name MEMORABLE and DISTINCT — these are senior executives with presence.
- Vary cultural backgrounds. Do NOT default to generic Anglo-Saxon names every time.`;

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
      { statusCode: 502 }
    );
  }

  return JSON.parse(jsonStr) as GeneratePersonaResponse;
}

/**
 * Evaluate a sales roleplay session transcript using Gemini.
 */
export async function evaluateSession(
  input: EvaluateSessionRequest
): Promise<EvaluateSessionResponse> {
  const { transcript, personaName, personaRole, intensityLevel, durationSeconds } =
    input;

  const prompt = `You are an expert sales performance evaluator and coach. Analyze the following sales roleplay transcript and provide a structured evaluation.

Persona Context:
- Buyer Name: ${personaName}
- Buyer Role: ${personaRole}
- Difficulty Level: ${intensityLevel}/3
- Call Duration: ${Math.round(durationSeconds / 60)} minutes

Transcript:
${transcript}

Evaluate the sales rep's performance on these criteria:
1. **Objection Handling** (1-10): Did the rep directly address objections? Did they acknowledge concerns before responding? Did they handle pushback confidently?
2. **Confidence** (1-10): Did the rep speak with authority? Did they avoid hedging or being overly apologetic? Did they maintain composure under pressure?
3. **Clarity** (1-10): Was the rep concise? Did they quantify value? Did they avoid rambling or going off-topic?

Also identify:
- 3-5 specific strengths (things the rep did well)
- 3-5 specific weaknesses (areas for improvement)
- 3-5 actionable improvement tips (specific, practical advice)

Return ONLY valid JSON in this exact format, no markdown:
{
  "objectionHandlingScore": <number 1-10>,
  "confidenceScore": <number 1-10>,
  "clarityScore": <number 1-10>,
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
      { statusCode: 502 }
    );
  }

  return JSON.parse(jsonStr) as EvaluateSessionResponse;
}
