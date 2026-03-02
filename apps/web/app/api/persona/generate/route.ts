import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, description, targetCustomer, industry, objections } =
      body;

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
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 1.2,
      },
    });

    const text = response.text ?? "";

    // Extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to generate persona. Invalid JSON response." },
        { status: 500 }
      );
    }

    const persona = JSON.parse(jsonMatch[0]);
    return NextResponse.json(persona);
  } catch (error) {
    console.error("Persona generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate persona" },
      { status: 500 }
    );
  }
}
