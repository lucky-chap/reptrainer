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

export interface CoachingInsight {
  type: "needs_coaching" | "improvement" | "team_weakness" | "skill_avoidance";
  user: string;
  title: string;
  explanation: string;
  recommendation: string;
  priority: number; // 1-10, higher is more important
}

interface SkillScores {
  discovery: number;
  objection_handling: number;
  positioning: number;
  closing: number;
  listening: number;
}

/**
 * Extracts normalized skill scores (0-100) from a session.
 */
function getSkillScores(session: Session | CallSession): SkillScores {
  const evaluation =
    "evaluation" in session
      ? session.evaluation
      : (session as any).legacyEvaluation;
  const feedback =
    "feedbackReport" in session ? (session as any).feedbackReport : null;

  if (evaluation && "discovery" in evaluation) {
    return {
      discovery: evaluation.discovery.score,
      objection_handling: evaluation.objectionHandling.score,
      positioning: evaluation.productPositioning.score,
      closing: evaluation.closing.score,
      listening: evaluation.activeListening.score,
    };
  }

  // Use feedback scores if available, otherwise scale legacy 0-10 scores
  const le = evaluation as any;
  const obj =
    feedback?.objection_handling_score ??
    (le?.objectionHandlingScore ?? 0) * 10;
  const conf = feedback?.confidence_score ?? (le?.confidenceScore ?? 0) * 10;
  const cls =
    feedback?.closing_effectiveness_score ?? (le?.confidenceScore ?? 0) * 10;
  const clr = (le?.clarityScore ?? 0) * 10;

  // Derive Discovery, Positioning, Listening from available data
  const dynamics = calculateDynamics(session);
  const listening = dynamics.talkToListenRatio.ai; // AI talk time is rep's listen time (approx)

  return {
    objection_handling: obj,
    closing: cls,
    discovery: Math.max(0, Math.min(100, Math.round((obj + clr) / 2) - 5)),
    positioning: Math.max(0, Math.min(100, Math.round((conf + clr) / 2))),
    listening: listening,
  };
}

/**
 * Generates actionable coaching insights from sessions.
 */
export function generateCoachingInsights(
  sessions: (Session | CallSession)[],
  userName: string = "All Members",
  isTeamView: boolean = false,
): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  if (sessions.length === 0) return insights;

  const evaluatedSessions = sessions.filter(
    (s) =>
      ("evaluation" in s ? s.evaluation : (s as any).legacyEvaluation) ||
      ("feedbackReport" in s ? (s as any).feedbackReport : null),
  );
  if (evaluatedSessions.length === 0) return insights;

  const skills: (keyof SkillScores)[] = [
    "discovery",
    "objection_handling",
    "positioning",
    "closing",
    "listening",
  ];

  // Helper to group sessions by user
  const sessionsByUser = new Map<string, (Session | CallSession)[]>();
  evaluatedSessions.forEach((s) => {
    const uid = "userId" in s ? s.userId : "unknown";
    if (!sessionsByUser.has(uid)) {
      sessionsByUser.set(uid, []);
    }
    sessionsByUser.get(uid)!.push(s);
  });

  // 1. INDIVIDUAL REP ANALYSIS (Low Scores & Improvement)
  // We analyze each user separately if we have enough data for them
  sessionsByUser.forEach((userSessions, userId) => {
    const repName = userSessions[0].userName || "Representative";
    const last5 = userSessions.slice(0, 5);

    // Skip individual analysis if we don't have enough recent context (min 3 sessions)
    if (userSessions.length < 3) return;

    // A. Individual Low Skill Scores
    skills.forEach((skill) => {
      const avg =
        last5.reduce((sum, s) => sum + getSkillScores(s)[skill], 0) /
        last5.length;
      if (avg < 60) {
        insights.push({
          type: "needs_coaching",
          user: repName,
          title: `${repName} needs coaching on ${skill.replace("_", " ")}`,
          explanation: `Average ${skill.replace("_", " ")} score: ${Math.round(avg)} across their last ${last5.length} sessions.`,
          recommendation: `Assign ${repName} ${skill.replace("_", " ")}-focused practice scenarios.`,
          priority: 8,
        });
      }
    });

    // B. Individual Improvement
    if (userSessions.length >= 6) {
      const recentAvg =
        userSessions.slice(0, 3).reduce((sum, s) => {
          const evalObj =
            "evaluation" in s ? s.evaluation : (s as any).legacyEvaluation;
          return sum + getOverallScore(evalObj);
        }, 0) / 3;
      const previousAvg =
        userSessions.slice(3, 6).reduce((sum, s) => {
          const evalObj =
            "evaluation" in s ? s.evaluation : (s as any).legacyEvaluation;
          return sum + getOverallScore(evalObj);
        }, 0) / 3;

      const normRecent = recentAvg <= 10 ? recentAvg * 10 : recentAvg;
      const normPrevious = previousAvg <= 10 ? previousAvg * 10 : previousAvg;

      if (normRecent - normPrevious > 12) {
        insights.push({
          type: "improvement",
          user: repName,
          title: `${repName} is showing significant progress`,
          explanation: `Overall performance increased by +${Math.round(normRecent - normPrevious)} points in their last 6 sessions.`,
          recommendation: `Acknowledge ${repName}'s growth and introduce more complex buyer personas.`,
          priority: 6,
        });
      }
    }

    // C. Skill Avoidance (Individual)
    skills.forEach((skill) => {
      const detectedCount = userSessions
        .slice(0, 10)
        .filter((s) => getSkillScores(s)[skill] > 20).length;
      const totalAnalyzed = Math.min(10, userSessions.length);
      if (totalAnalyzed >= 5 && detectedCount < totalAnalyzed * 0.25) {
        insights.push({
          type: "skill_avoidance",
          user: repName,
          title: `${repName} is avoiding ${skill.replace("_", " ")}`,
          explanation: `${skill.replace("_", " ")} was properly demonstrated in only ${detectedCount} of their last ${totalAnalyzed} sessions.`,
          recommendation: `Direct ${repName} to scenarios explicitly requiring ${skill.replace("_", " ")}.`,
          priority: 7,
        });
      }
    });
  });

  // 2. TEAM WIDE ANALYSIS
  if (isTeamView && sessionsByUser.size > 1) {
    skills.forEach((skill) => {
      const teamAvg =
        evaluatedSessions.reduce(
          (sum, s) => sum + getSkillScores(s)[skill],
          0,
        ) / evaluatedSessions.length;
      if (teamAvg < 65) {
        insights.push({
          type: "team_weakness",
          user: "Team",
          title: `Broad team weakness in ${skill.replace("_", " ")}`,
          explanation: `The overall team average for ${skill.replace("_", " ")} is currently ${Math.round(teamAvg)}.`,
          recommendation: `Organize a group workshop focusing on ${skill.replace("_", " ")} strategies.`,
          priority: 9,
        });
      }
    });
  }

  // Final sorting and Deduplication/Filtering
  // Sort by priority (desc)
  const sortedInsights = insights.sort((a, b) => b.priority - a.priority);

  // If specific member filter is active, only show their insights or relevant team ones
  const finalInsights = isTeamView
    ? sortedInsights // Leaders see everything (individual + team)
    : sortedInsights.filter((i) => i.user !== "Team"); // Members only see their own (passed userName should match i.user)

  // Limit to most relevant 6
  return finalInsights.slice(0, 6);
}
