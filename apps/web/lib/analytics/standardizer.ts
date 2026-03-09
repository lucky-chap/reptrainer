import {
  type Session,
  type CallSession,
  type SessionEvaluation,
} from "../db/core";
import { type FeedbackReport } from "@reptrainer/shared";

export interface StandardizedScores {
  overall: number;
  discovery: number;
  objection_handling: number;
  positioning: number;
  closing: number;
  listening: number;
  confidence: number;
}

/**
 * Normalizes a score to a 0-100 scale.
 * Note: Legacy 0-10 scaling support was removed to prevent 0-100 scores from being inflated.
 */
export function normalizeTo100(value: number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  // Previously we multiplied small values by 10, which caused 7/100 to become 70/100.
  // We now strictly cap at 0-100 and round to nearest integer.
  return Math.round(Math.min(100, Math.max(0, value)));
}

/**
 * Extracts standardized 0-100 scores from any session evaluation format.
 */
export function calculateSessionMetrics(
  session: Session | CallSession,
): StandardizedScores {
  const evaluation = "evaluation" in session ? session.evaluation : null;
  const legacyEval =
    "legacyEvaluation" in session ? (session as any).legacyEvaluation : null;
  const feedback =
    "feedbackReport" in session ? (session as any).feedbackReport : null;

  const activeEval = feedback || evaluation || legacyEval;

  if (!activeEval) {
    return {
      overall: 0,
      discovery: 0,
      objection_handling: 0,
      positioning: 0,
      closing: 0,
      listening: 0,
      confidence: 0,
    };
  }

  // 1. Handle New structured SessionEvaluation
  if ("discovery" in activeEval && typeof activeEval.discovery === "object") {
    const e = activeEval as SessionEvaluation;

    // Calculate the average of the 5 core skills to prevent AI hallucinations (e.g. flat 18 score)
    const scoresToAverage: number[] = [];
    if (e.discovery?.score !== undefined)
      scoresToAverage.push(normalizeTo100(e.discovery.score));
    if (e.objectionHandling?.score !== undefined)
      scoresToAverage.push(normalizeTo100(e.objectionHandling.score));
    if (e.productPositioning?.score !== undefined)
      scoresToAverage.push(normalizeTo100(e.productPositioning.score));
    if (e.closing?.score !== undefined)
      scoresToAverage.push(normalizeTo100(e.closing.score));
    if (e.activeListening?.score !== undefined)
      scoresToAverage.push(normalizeTo100(e.activeListening.score));

    const calculatedOverall =
      scoresToAverage.length > 0
        ? Math.round(
            scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length,
          )
        : normalizeTo100(e.overallScore) || 0;

    return {
      overall: calculatedOverall,
      discovery: normalizeTo100(e.discovery?.score) || calculatedOverall,
      objection_handling:
        normalizeTo100(e.objectionHandling?.score) || calculatedOverall,
      positioning:
        normalizeTo100(e.productPositioning?.score) || calculatedOverall,
      closing: normalizeTo100(e.closing?.score) || calculatedOverall,
      listening: normalizeTo100(e.activeListening?.score) || calculatedOverall,
      confidence:
        normalizeTo100(e.productPositioning?.score) || calculatedOverall,
    };
  }

  // 2. Handle FeedbackReport (AI Call Session)
  if (
    "overall_score" in activeEval ||
    (activeEval as any).overallScore !== undefined
  ) {
    const f = activeEval as any;
    const overall = normalizeTo100(f.overall_score ?? f.overallScore);
    const conf = normalizeTo100(f.confidence_score ?? f.confidenceScore);
    return {
      overall,
      discovery:
        normalizeTo100(f.discovery_score ?? f.discovery?.score) || overall,
      objection_handling:
        normalizeTo100(
          f.objection_handling_score ?? f.objectionHandlingScore,
        ) || overall,
      positioning: conf || overall,
      closing:
        normalizeTo100(f.closing_effectiveness_score ?? f.closingScore) ||
        conf ||
        overall,
      listening: normalizeTo100(f.clarity_score ?? f.clarityScore) || overall,
      confidence: conf || overall,
    };
  }

  // 3. Handle Legacy Evaluation Format
  const le = activeEval as any;
  const obj = normalizeTo100(le.objectionHandlingScore);
  const conf = normalizeTo100(le.confidenceScore);
  const clr = normalizeTo100(le.clarityScore);
  const overall = Math.round((obj + conf + clr) / 3) || conf || obj || 0;

  return {
    overall,
    discovery: Math.round((obj + clr) / 2) || conf || overall,
    objection_handling: obj || overall,
    positioning: conf || overall,
    closing: conf || overall,
    listening: clr || overall,
    confidence: conf || overall,
  };
}
