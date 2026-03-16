import {
  type FeedbackReport,
  GEMINI_PRO_MODEL,
  type TranscriptMessage,
} from "@reptrainer/shared";
import { extractJson, genAI } from "./vertex.js";

export interface AnalyzeCallResponse {
  transcript: TranscriptMessage[];
  feedbackReport: FeedbackReport;
}

/**
 * Analyzes an uploaded sales call recording using Gemini Pro.
 * Transcribes the audio with speaker labels and generates a structured feedback report.
 */
export async function analyzeCallFile(
  buffer: Buffer,
  mimeType: string,
): Promise<AnalyzeCallResponse> {
  const model = GEMINI_PRO_MODEL;

  const prompt = `You are an expert sales performance coach. I am providing you with an audio recording of a sales conversation.
  
  Your task is to:
  1. Transcribe the conversation accurately.
  2. Identify the different speakers (e.g., "Sales Rep" and "Prospect/Customer").
  3. Create a speaker-labeled transcript.
  4. Evaluate the sales rep's performance based on the transcript.
  
  EVALUATION CRITERIA:
  - Discovery: Did they uncover pain points and qualify the lead?
  - Objection Handling: How well did they overcome resistance?
  - Product Positioning: Did they link features to the specific needs mentioned?
  - Closing: Did they clearly define next steps?
  - Active Listening: Did they show engagement and empathy?
  
  RESPONSE FORMAT:
  You must return a raw JSON object with high precision. Return ONLY the JSON.
  
  {
    "transcript": [
      { "role": "prospect" | "rep", "text": "...", "timestamp": "MM:SS" }
    ],
    "feedbackReport": {
      "discovery": { "score": 0-100, "explanation": "..." },
      "objectionHandling": { "score": 0-100, "explanation": "..." },
      "productPositioning": { "score": 0-100, "explanation": "..." },
      "closing": { "score": 0-100, "explanation": "..." },
      "activeListening": { "score": 0-100, "explanation": "..." },
      "overallScore": 0-100,
      "strengths": ["...", "...", "..."],
      "weaknesses": ["...", "...", "..."],
      "improvementTips": ["...", "...", "..."]
    }
  }
  
  Ensure the transcript is complete and speaker labels are consistent.
  Identify the "Sales Rep" (the person selling) and the "Prospect" (the person being sold to).
  `;

  console.log(
    `[analyzer] Starting analysis with ${model} for file type ${mimeType}...`,
  );

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    const jsonStr = extractJson(text);

    if (!jsonStr) {
      throw new Error("Failed to extract JSON from Gemini response.");
    }

    const data = JSON.parse(jsonStr);

    // Validate basic structure
    if (!data.transcript || !data.feedbackReport) {
      throw new Error("Invalid response structure from Gemini.");
    }

    console.log("[analyzer] Analysis complete.");
    return data as AnalyzeCallResponse;
  } catch (error) {
    console.error("[analyzer] Gemini analysis failed:", error);
    throw error;
  }
}
