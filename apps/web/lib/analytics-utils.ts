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
    "evaluation" in session ? session.evaluation : session.legacyEvaluation;
  const feedback = "feedbackReport" in session ? session.feedbackReport : null;

  // Use feedback scores if available, otherwise scale legacy 0-10 scores
  const obj =
    feedback?.objection_handling_score ??
    (evaluation?.objectionHandlingScore ?? 0) * 10;
  const conf =
    feedback?.confidence_score ?? (evaluation?.confidenceScore ?? 0) * 10;
  const cls =
    feedback?.closing_effectiveness_score ??
    (evaluation?.confidenceScore ?? 0) * 10;
  const clr = (evaluation?.clarityScore ?? 0) * 10;

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
  if (sessions.length < 3) return insights;

  const evaluatedSessions = sessions.filter(
    (s) =>
      ("evaluation" in s ? s.evaluation : s.legacyEvaluation) ||
      ("feedbackReport" in s ? s.feedbackReport : null),
  );
  if (evaluatedSessions.length === 0) return insights;

  const recentSessions = evaluatedSessions.slice(0, 10);
  const last5 = recentSessions.slice(0, 5);

  const skills: (keyof SkillScores)[] = [
    "discovery",
    "objection_handling",
    "positioning",
    "closing",
    "listening",
  ];

  // 1. LOW SKILL SCORE (Individual or Team)
  skills.forEach((skill) => {
    const avg =
      last5.reduce((sum, s) => sum + getSkillScores(s)[skill], 0) /
      Math.min(last5.length, 5);
    if (avg < 60) {
      insights.push({
        type: isTeamView ? "team_weakness" : "needs_coaching",
        user: isTeamView ? "Team" : sessions[0].userName || "User",
        title: isTeamView
          ? `Team struggling with ${skill.replace("_", " ")}`
          : `${sessions[0].userName || "Rep"} needs coaching on ${skill.replace("_", " ")}`,
        explanation: `Average ${skill.replace("_", " ")} score: ${Math.round(avg)} across the last ${last5.length} sessions`,
        recommendation: `Assign ${skill.replace("_", " ")}-focused practice scenarios`,
        priority: isTeamView ? 9 : 8,
      });
    }
  });

  // 2. SKILL AVOIDANCE
  // Simplified detection: if the score is consistently 0 (not evaluated) or very low intensity
  skills.forEach((skill) => {
    const detectedCount = recentSessions.filter(
      (s) => getSkillScores(s)[skill] > 20,
    ).length;
    if (detectedCount < recentSessions.length * 0.2) {
      insights.push({
        type: "skill_avoidance",
        user: isTeamView ? "Team" : sessions[0].userName || "User",
        title: `${isTeamView ? "Team" : sessions[0].userName || "Rep"} rarely practices ${skill.replace("_", " ")}`,
        explanation: `${skill.replace("_", " ")} skill detected in only ${detectedCount} of the last ${recentSessions.length} sessions`,
        recommendation: `Increase focus on ${skill.replace("_", " ")} in the next training cycle`,
        priority: 7,
      });
    }
  });

  // 3. IMPROVEMENT DETECTION
  if (evaluatedSessions.length >= 6) {
    const recentAvg =
      evaluatedSessions
        .slice(0, 3)
        .reduce(
          (sum, s) =>
            sum +
            getOverallScore(
              "evaluation" in s ? s.evaluation : s.legacyEvaluation,
            ),
          0,
        ) / 3;
    const previousAvg =
      evaluatedSessions
        .slice(3, 6)
        .reduce(
          (sum, s) =>
            sum +
            getOverallScore(
              "evaluation" in s ? s.evaluation : s.legacyEvaluation,
            ),
          0,
        ) / 3;

    // Convert 0-10 overall score to 100 scale if needed for comparison (getOverallScore handles 0-100 too)
    const normalizedRecent = recentAvg <= 10 ? recentAvg * 10 : recentAvg;
    const normalizedPrevious =
      previousAvg <= 10 ? previousAvg * 10 : previousAvg;

    if (normalizedRecent - normalizedPrevious > 15) {
      insights.push({
        type: "improvement",
        user: isTeamView ? sessions[0].userName || "User" : "User",
        title: `${sessions[0].userName || "Rep"} is improving rapidly`,
        explanation: `Score increased by +${Math.round(normalizedRecent - normalizedPrevious)} points across recent sessions`,
        recommendation: "Keep up the momentum and try more advanced personas",
        priority: 6,
      });
    }
  }

  // 4. TEAM WEAKNESS (Redundant with LOW SKILL but higher threshold if requested)
  if (isTeamView) {
    skills.forEach((skill) => {
      const avg =
        evaluatedSessions.reduce(
          (sum, s) => sum + getSkillScores(s)[skill],
          0,
        ) / evaluatedSessions.length;
      if (avg < 65) {
        // Only add if not already added by LOW SKILL logic (prioritize recent data)
        if (
          !insights.some(
            (i) => i.type === "team_weakness" && i.title.includes(skill),
          )
        ) {
          insights.push({
            type: "team_weakness",
            user: "Team",
            title: `Team struggling with ${skill.replace("_", " ")}`,
            explanation: `Overall team average for ${skill.replace("_", " ")} is ${Math.round(avg)}`,
            recommendation: "Schedule a group coaching session on this skill",
            priority: 5,
          });
        }
      }
    });
  }

  // Final filtering and prioritization
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 6);
}
