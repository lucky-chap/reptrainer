import type { Session, CallSession } from "../db";
import { getOverallScore } from "./scoring";
import { calculateDynamics } from "./dynamics";
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
