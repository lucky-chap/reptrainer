import { calculateSessionMetrics, normalizeTo100 } from "./standardizer";
import type {
  Session,
  CallSession,
  FeedbackReport,
  SessionEvaluation,
} from "../db/core";

export interface CompetencyData {
  subject: string;
  A: number;
  fullMark: number;
}

export interface ConversationalDynamics {
  talkToListenRatio: { user: number; ai: number };
  paceWPM: number;
  fillerWords: number;
  interruptions: number;
}

/**
 * Gets the overall score for an evaluation, standardized to 0-100.
 */
export function getOverallScore(
  sessionOrEvaluation:
    | Session
    | CallSession
    | SessionEvaluation
    | FeedbackReport
    | null,
): number {
  if (!sessionOrEvaluation) return 0;

  // If it's a full session object, use calculateSessionMetrics
  if (typeof sessionOrEvaluation === "object" && "id" in sessionOrEvaluation) {
    return calculateSessionMetrics(sessionOrEvaluation as Session | CallSession)
      .overall;
  }

  const evaluation = sessionOrEvaluation as any;
  if (evaluation.overallScore !== undefined)
    return normalizeTo100(evaluation.overallScore);
  if (evaluation.overall_score !== undefined)
    return normalizeTo100(evaluation.overall_score);

  // Legacy fallback
  if (evaluation.objectionHandlingScore !== undefined) {
    const obj = normalizeTo100(evaluation.objectionHandlingScore);
    const conf = normalizeTo100(evaluation.confidenceScore);
    const clr = normalizeTo100(evaluation.clarityScore);
    return Math.round((obj + conf + clr) / 3);
  }

  return 0;
}

/**
 * Calculates competency radar data from a list of sessions.
 */
export function calculateCompetencies(
  sessions: (Session | CallSession)[],
): CompetencyData[] {
  if (sessions.length === 0) return [];

  const totals = sessions.reduce(
    (acc, session) => {
      const metrics = calculateSessionMetrics(session);
      acc.discovery += metrics.discovery;
      acc.objection += metrics.objection_handling;
      acc.positioning += metrics.positioning;
      acc.closing += metrics.closing;
      acc.listening += metrics.listening;
      return acc;
    },
    { discovery: 0, objection: 0, positioning: 0, closing: 0, listening: 0 },
  );

  const count = sessions.length;
  return [
    {
      subject: "Discovery",
      A: Math.round(totals.discovery / count),
      fullMark: 100,
    },
    {
      subject: "Objection Handling",
      A: Math.round(totals.objection / count),
      fullMark: 100,
    },
    {
      subject: "Product Positioning",
      A: Math.round(totals.positioning / count),
      fullMark: 100,
    },
    {
      subject: "Closing",
      A: Math.round(totals.closing / count),
      fullMark: 100,
    },
    {
      subject: "Active Listening",
      A: Math.round(totals.listening / count),
      fullMark: 100,
    },
  ];
}
