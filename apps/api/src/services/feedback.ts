import { VertexAI, GenerationConfig } from "@google-cloud/vertexai";
import { env } from "../config/env.js";
import {
  GEMINI_EVALUATION_MODEL,
  TRAINING_TRACKS,
  type FeedbackReportRequest,
  type FeedbackReport,
} from "@reptrainer/shared";

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
});

/**
 * Extracts JSON from a potentially markdown-wrapped AI response.
 */
function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Build additional prompt context if a training track/scenario was used.
 */
function buildTrackContext(trackId?: string, scenarioId?: string): string {
  if (!trackId) return "";

  const track = TRAINING_TRACKS.find((t) => t.id === trackId);
  if (!track) return "";

  const scenario = scenarioId
    ? track.scenarios.find((s) => s.id === scenarioId)
    : null;

  let context = `\n\n─── TRAINING TRACK CONTEXT ───
This call was part of the "${track.name}" training track.
Track description: ${track.description}`;

  if (scenario) {
    context += `\n\nScenario: "${scenario.name}" — ${scenario.description}
Expected skills: ${scenario.expectedSkills.join(", ")}

EVALUATION WEIGHTING (adjust your scoring emphasis accordingly):
- Objection Handling: ${scenario.evaluationWeighting.objection_handling}%
- Closing Effectiveness: ${scenario.evaluationWeighting.closing_effectiveness}%
- Confidence: ${scenario.evaluationWeighting.confidence}%
- Rapport Building: ${scenario.evaluationWeighting.rapport_building}%
- Discovery Skills: ${scenario.evaluationWeighting.discovery_skills}%

Weight your overall_score and commentary to reflect these priorities.`;
  }

  return context;
}

/**
 * Generate a structured feedback report from a sales call transcript.
 * Acts as a senior enterprise sales coach providing deep, actionable feedback.
 */
export async function generateFeedbackReport(
  input: FeedbackReportRequest,
): Promise<FeedbackReport> {
  const {
    transcript,
    personaName,
    personaRole,
    intensityLevel,
    durationSeconds,
    trackId,
    scenarioId,
  } = input;

  const model = vertexAI.getGenerativeModel({
    model: GEMINI_EVALUATION_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3, // Lower temperature for more deterministic output
    } as GenerationConfig,
  });

  const trackContext = buildTrackContext(trackId, scenarioId);

  const prompt = `You are a **Senior Enterprise Sales Coach** with 20+ years of experience training top-performing B2B sales reps at Fortune 500 companies. You have coached reps at Salesforce, Oracle, and HubSpot.

Your task is to review a sales roleplay transcript and provide structured, actionable feedback that a real sales manager would give after shadowing a rep on a call.

─── CALL CONTEXT ───
- Buyer: ${personaName} (${personaRole})
- Buyer Difficulty: ${intensityLevel}/5 (${["friendly skeptic", "firm decision maker", "tough negotiator", "high-pressure executive", "hostile gatekeeper"][intensityLevel - 1]})
- Call Duration: ${Math.round(durationSeconds / 60)} minutes${trackContext}

─── TRANSCRIPT ───
${transcript}

─── EVALUATION INSTRUCTIONS ───

1. **Be specific.** Reference exact quotes or paraphrased moments from the transcript. Don't give generic advice.
2. **Be balanced.** Acknowledge what the rep did well AND where they fell short.
3. **Be actionable.** Every suggestion must be something the rep can practice or change immediately.
4. **Score honestly.** Don't inflate scores. A truly excellent rep gets 85+. Average is 50-65. Poor is below 40.

─── OUTPUT FORMAT ───

Return ONLY valid JSON matching this exact structure:

{
  "overall_score": <number 0-100>,
  "strengths": [
    "<Specific strength referencing a moment from the call. E.g.: 'Strong opening — you immediately established credibility by mentioning the case study with [Company].'>"
  ],
  "weaknesses": [
    "<Specific weakness referencing a moment from the call. E.g.: 'When asked about ROI, you deflected instead of providing concrete numbers.'>"
  ],
  "missed_opportunities": [
    "<Specific moment where the rep could have done something different. E.g.: 'When the buyer mentioned their team struggles with onboarding, you missed the chance to position your training module.'>"
  ],
  "objection_handling_score": <number 0-100>,
  "closing_effectiveness_score": <number 0-100>,
  "confidence_score": <number 0-100>,
  "suggested_improvements": [
    "<Actionable improvement tip. E.g.: 'Practice the LAER framework: Listen, Acknowledge, Explore, Respond when handling objections.'>"
  ]
}

CRITICAL RULES:
- Return 3-5 items per array field.
- Every string in strengths/weaknesses/missed_opportunities MUST reference a specific moment or quote from the transcript.
- suggested_improvements should be forward-looking coaching advice, not just restating weaknesses.
- Scores should be integers.
- overall_score should be a weighted reflection of the sub-scores, not just an average.`;

  console.log(
    `[feedback] Sending transcript (${transcript.length} chars) to ${GEMINI_EVALUATION_MODEL} for feedback`,
  );

  const response = await model.generateContent(prompt);
  const text = response.response.candidates?.[0].content.parts?.[0].text ?? "";
  const jsonStr = extractJson(text);

  if (!jsonStr) {
    console.error("[feedback] Failed to extract JSON from response:", text);
    throw Object.assign(
      new Error(
        "Failed to generate feedback report. Invalid JSON response from AI.",
      ),
      { statusCode: 502 },
    );
  }

  const report = JSON.parse(jsonStr) as FeedbackReport;

  // Validate required fields
  if (
    typeof report.overall_score !== "number" ||
    !Array.isArray(report.strengths) ||
    !Array.isArray(report.weaknesses) ||
    !Array.isArray(report.missed_opportunities) ||
    typeof report.objection_handling_score !== "number" ||
    typeof report.closing_effectiveness_score !== "number" ||
    typeof report.confidence_score !== "number" ||
    !Array.isArray(report.suggested_improvements)
  ) {
    console.error("[feedback] Invalid report structure:", report);
    throw Object.assign(new Error("Feedback report has invalid structure"), {
      statusCode: 502,
    });
  }

  console.log(
    `[feedback] Generated report — overall_score: ${report.overall_score}`,
  );
  return report;
}
