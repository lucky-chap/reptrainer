import type {
  Session,
  CallSession,
  FeedbackReport,
  SessionEvaluation,
  Product,
  Persona,
} from "./db";

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
  if ("overall_score" in evaluation) return evaluation.overall_score;
  return Math.round(
    ((evaluation.objectionHandlingScore || 0) +
      (evaluation.confidenceScore || 0) +
      (evaluation.clarityScore || 0)) /
      3,
  );
}

/**
 * Calculates competency radar data from a list of sessions.
 */
export function calculateCompetencies(
  sessions: (Session | CallSession)[],
): CompetencyData[] {
  const evaluations = sessions
    .map((s) => ("evaluation" in s ? s.evaluation : s.legacyEvaluation))
    .filter(Boolean);

  if (evaluations.length === 0) return [];

  const totals = evaluations.reduce(
    (acc, e) => {
      acc.objection += e!.objectionHandlingScore || 0;
      acc.confidence += e!.confidenceScore || 0;
      acc.clarity += e!.clarityScore || 0;
      // We can infer Discovery and Rapport if we have more detailed reports,
      // but for now we use the core 3 and maybe some derived ones.
      return acc;
    },
    { objection: 0, confidence: 0, clarity: 0 },
  );

  const count = evaluations.length;
  return [
    {
      subject: "Objection Handling",
      A: Math.round(totals.objection / count),
      fullMark: 10,
    },
    {
      subject: "Confidence",
      A: Math.round(totals.confidence / count),
      fullMark: 10,
    },
    { subject: "Clarity", A: Math.round(totals.clarity / count), fullMark: 10 },
    // Derived/Simulated for the demo to show a full radar
    {
      subject: "Rapport",
      A: Math.min(
        10,
        Math.round((totals.confidence + totals.clarity) / (2 * count)) + 1,
      ),
      fullMark: 10,
    },
    {
      subject: "Discovery",
      A: Math.min(
        10,
        Math.round((totals.objection + totals.clarity) / (2 * count)) - 1,
      ),
      fullMark: 10,
    },
  ];
}

/**
 * Calculates conversational dynamics for a single session.
 */
export function calculateDynamics(
  session: Session | CallSession,
): ConversationalDynamics {
  let userChars = 0;
  let aiChars = 0;
  let wordCount = 0;

  if (
    "transcriptMessages" in session &&
    session.transcriptMessages.length > 0
  ) {
    session.transcriptMessages.forEach((msg) => {
      if (msg.role === "user") {
        userChars += msg.text.length;
        wordCount += msg.text.split(/\s+/).length;
      } else if (msg.role === "model") {
        aiChars += msg.text.length;
      }
    });
  } else {
    // Fallback for legacy transcript string (approximate)
    const transcript =
      ("transcript" in session ? session.transcript : "") || "";
    const lines = transcript.split("\n\n");
    lines.forEach((line: string) => {
      if (line.toLowerCase().startsWith("user:") || line.includes(" (You):")) {
        userChars += line.length;
        wordCount += line.split(/\s+/).length;
      } else {
        aiChars += line.length;
      }
    });
  }

  const total = userChars + aiChars;
  const talkRatio = total > 0 ? Math.round((userChars / total) * 100) : 50;

  const durationSeconds =
    "durationSeconds" in session
      ? session.durationSeconds
      : (session as any).durationSeconds;
  const durationMinutes = (durationSeconds || 0) / 60;
  const pace =
    durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;

  return {
    talkToListenRatio: { user: talkRatio, ai: 100 - talkRatio },
    paceWPM: pace,
    fillerWords: Math.floor(Math.random() * 5), // Mocked for now
    interruptions: Math.floor(Math.random() * 3), // Mocked for now
  };
}

/**
 * Aggregates dynamics across multiple sessions.
 */
export function aggregateDynamics(
  sessions: (Session | CallSession)[],
): ConversationalDynamics {
  if (sessions.length === 0) {
    return {
      talkToListenRatio: { user: 50, ai: 50 },
      paceWPM: 0,
      fillerWords: 0,
      interruptions: 0,
    };
  }

  const allDynamics = sessions.map(calculateDynamics);
  const count = allDynamics.length;

  return {
    talkToListenRatio: {
      user: Math.round(
        allDynamics.reduce((sum, d) => sum + d.talkToListenRatio.user, 0) /
          count,
      ),
      ai: Math.round(
        allDynamics.reduce((sum, d) => sum + d.talkToListenRatio.ai, 0) / count,
      ),
    },
    paceWPM: Math.round(
      allDynamics.reduce((sum, d) => sum + d.paceWPM, 0) / count,
    ),
    fillerWords: Math.round(
      allDynamics.reduce((sum, d) => sum + d.fillerWords, 0) / count,
    ),
    interruptions: Math.round(
      allDynamics.reduce((sum, d) => sum + d.interruptions, 0) / count,
    ),
  };
}
/**
 * Calculates average scores per category (persona or product).
 */
export function calculateCategoryScores(
  sessions: (Session | CallSession)[],
  category: "product" | "persona",
  products?: Product[],
): { name: string; score: number }[] {
  const scores: Record<string, { total: number; count: number }> = {};

  sessions.forEach((s) => {
    const evaluation = "evaluation" in s ? s.evaluation : s.legacyEvaluation;
    if (!evaluation) return;

    let name = "Unknown";
    if (category === "product") {
      const productId = "productId" in s ? s.productId : "default";
      const product = products?.find((p) => p.id === productId);
      name = product?.companyName || productId;
      if (name === "default") name = "Standard Drill";
    } else {
      name = s.personaName || "Default Persona";
    }

    if (!scores[name]) {
      scores[name] = { total: 0, count: 0 };
    }
    scores[name].total += getOverallScore(evaluation);
    scores[name].count += 1;
  });

  return Object.entries(scores)
    .map(([name, data]) => ({
      name,
      score: Math.round((data.total / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Limit to top 5
}

/**
 * Calculates team training coverage across products and personas.
 */
export function calculateTeamCoverage(
  sessions: (Session | CallSession)[],
  products: Product[],
  personas: Persona[],
): {
  productName: string;
  coverage: number;
  totalPersonas: number;
  practicedPersonas: number;
}[] {
  if (products.length === 0) return [];

  return products.map((product) => {
    const productPersonas = personas.filter((p) => p.productId === product.id);
    if (productPersonas.length === 0) {
      return {
        productName: product.companyName,
        coverage: 0,
        totalPersonas: 0,
        practicedPersonas: 0,
      };
    }

    const practicedPersonaIds = new Set(
      sessions
        .filter((s) => s.productId === product.id)
        .map((s) => s.personaId),
    );

    const practicedCount = productPersonas.filter((p) =>
      practicedPersonaIds.has(p.id),
    ).length;
    const coverage = Math.round(
      (practicedCount / productPersonas.length) * 100,
    );

    return {
      productName: product.companyName,
      coverage,
      totalPersonas: productPersonas.length,
      practicedPersonas: practicedCount,
    };
  });
}
