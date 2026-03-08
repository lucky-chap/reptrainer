import type { Session, CallSession, FeedbackReport, SessionEvaluation } from "../db";
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

export function getOverallScore(
  evaluation: SessionEvaluation | FeedbackReport | null,
): number {
  if (!evaluation) return 0;
  if ("overallScore" in evaluation) return evaluation.overallScore;
  if ("overall_score" in evaluation) return (evaluation as any).overall_score;

  // Legacy fallback for 0-10 scores
  const legacyEval = evaluation as any;
  if (legacyEval.objectionHandlingScore !== undefined) {
    return Math.round(
      ((legacyEval.objectionHandlingScore || 0) +
        (legacyEval.confidenceScore || 0) +
        (legacyEval.clarityScore || 0)) /
        3,
    );
  }
  return 0;
}

/**
 * Calculates competency radar data from a list of sessions.
 */
export function calculateCompetencies(
  sessions: (Session | CallSession)[],
): CompetencyData[] {
  const evaluations = sessions
    .map((s) =>
      "evaluation" in s ? s.evaluation : (s as any).legacyEvaluation,
    )
    .filter(Boolean);

  if (evaluations.length === 0) return [];

  const totals = evaluations.reduce(
    (acc, e) => {
      if ("discovery" in e!) {
        acc.discovery += e.discovery.score;
        acc.objection += e.objectionHandling.score;
        acc.positioning += e.productPositioning.score;
        acc.closing += e.closing.score;
        acc.listening += e.activeListening.score;
      } else {
        // Legacy fallback (scale 0-10 to 0-100)
        const le = e as any;
        acc.objection += (le.objectionHandlingScore || 0) * 10;
        acc.discovery += (le.confidenceScore || 0) * 10; // Mix of confidence/clarity
        acc.positioning += (le.clarityScore || 0) * 10;
        acc.closing += (le.confidenceScore || 0) * 8;
        acc.listening += (le.clarityScore || 0) * 9;
      }
      return acc;
    },
    { discovery: 0, objection: 0, positioning: 0, closing: 0, listening: 0 },
  );

  const count = evaluations.length;
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
