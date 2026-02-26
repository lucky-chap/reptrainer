import { NextResponse } from "next/server";

export async function POST() {
  try {
    // For the MVP, we return the API key directly to establish the Live session.
    // In production, use ephemeral tokens:
    // https://ai.google.dev/gemini-api/docs/ephemeral-tokens
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error("Token error:", error);
    return NextResponse.json(
      { error: "Failed to get API key" },
      { status: 500 }
    );
  }
}
