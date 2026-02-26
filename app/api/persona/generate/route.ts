import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, description, targetCustomer, industry, objections } =
      body;

    const prompt = `You are a sales training AI. Generate a realistic buyer persona for a sales roleplay session.

Context:
- Company: ${companyName}
- Product: ${description}
- Target Customer: ${targetCustomer}
- Industry: ${industry}
- Common Objections: ${objections.join(", ")}

Generate a buyer persona with the following JSON structure. Return ONLY valid JSON, no markdown:
{
  "name": "Full Name of the persona (e.g., 'Sarah Chen')",
  "role": "Job title (e.g., 'VP of Engineering')",
  "personalityPrompt": "A detailed system prompt (3-5 sentences) describing how this persona should behave in a sales call. Include their communication style, priorities, and decision-making approach.",
  "intensityLevel": 1-3 (1=friendly skeptic, 2=tough negotiator, 3=hostile gatekeeper),
  "objectionStrategy": "Brief description of their primary objection approach",
  "traits": {
    "aggressiveness": 1-3,
    "interruptionFrequency": "low" | "medium" | "high",
    "objectionStyle": "analytical" | "emotional" | "authority-based" | "budget-focused"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text ?? "";

    // Extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to generate persona" },
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
