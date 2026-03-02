import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, personaName, personaRole, intensityLevel, durationSeconds } = body;

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
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to evaluate session" },
        { status: 500 }
      );
    }

    const evaluation = JSON.parse(jsonMatch[0]);
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate session" },
      { status: 500 }
    );
  }
}
