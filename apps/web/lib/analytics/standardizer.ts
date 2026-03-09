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
 * If the value is >= 0 and <= 10, it's assumed to be on a 0-10 scale and is multiplied by 10.
 * Otherwise, it's assumed to be already on a 0-100 scale.
 */
export function normalizeTo100(value: number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  // If the value is 10 or less, we assume it's on a 0-10 scale (common in legacy data)
  // However, we need to be careful with 0.
  if (value > 0 && value <= 10) return Math.round(value * 10);
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
    const overall = normalizeTo100(e.overallScore);
    return {
      overall,
      discovery: normalizeTo100(e.discovery?.score) || overall,
      objection_handling: normalizeTo100(e.objectionHandling?.score) || overall,
      positioning: normalizeTo100(e.productPositioning?.score) || overall,
      closing: normalizeTo100(e.closing?.score) || overall,
      listening: normalizeTo100(e.activeListening?.score) || overall,
      confidence: normalizeTo100(e.productPositioning?.score) || overall,
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
