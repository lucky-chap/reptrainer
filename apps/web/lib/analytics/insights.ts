import type { Session, CallSession } from "../db";
import {
  getOverallScore,
  calculateSessionMetrics,
} from "@/lib/analytics-utils";
import { calculateDynamics } from "./dynamics";
import type { CoachingInsightsScoreSummary } from "@reptrainer/shared";

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
  const metrics = calculateSessionMetrics(session);
  return {
    discovery: metrics.discovery,
    objection_handling: metrics.objection_handling,
    positioning: metrics.positioning,
    closing: metrics.closing,
    listening: metrics.listening,
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

/**
 * Calculates the recent performance trend for a set of sessions.
 */
export function calculateTrend(
  sessions: (Session | CallSession)[],
): "improving" | "declining" | "stable" {
  if (sessions.length < 4) return "stable";

  const half = Math.floor(sessions.length / 2);
  const recentSessions = sessions.slice(0, half);
  const olderSessions = sessions.slice(half, half * 2);

  if (recentSessions.length === 0 || olderSessions.length === 0)
    return "stable";

  const recentAvg =
    recentSessions.reduce(
      (sum, s) => sum + calculateSessionMetrics(s).overall,
      0,
    ) / recentSessions.length;
  const olderAvg =
    olderSessions.reduce(
      (sum, s) => sum + calculateSessionMetrics(s).overall,
      0,
    ) / olderSessions.length;

  const diff = recentAvg - olderAvg;
  if (diff > 8) return "improving";
  if (diff < -8) return "declining";
  return "stable";
}

/**
 * Builds score summaries for RAG coaching insights from sessions grouped by user.
 */
export function buildScoreSummaries(
  sessions: (Session | CallSession)[],
  members: { id: string; name: string }[],
): CoachingInsightsScoreSummary[] {
  const sessionsByUser = new Map<string, (Session | CallSession)[]>();
  sessions.forEach((s) => {
    const uid = "userId" in s ? s.userId : "unknown";
    if (!sessionsByUser.has(uid)) sessionsByUser.set(uid, []);
    sessionsByUser.get(uid)!.push(s);
  });

  const skills = [
    "discovery",
    "objection_handling",
    "positioning",
    "closing",
    "listening",
  ] as const;

  const summaries: CoachingInsightsScoreSummary[] = [];

  sessionsByUser.forEach((userSessions, userId) => {
    if (userSessions.length < 2) return;

    const member = members.find((m) => m.id === userId);
    const userName =
      member?.name || (userSessions[0] as any).userName || "Representative";

    const avgScores = {
      overall: 0,
      discovery: 0,
      objection_handling: 0,
      positioning: 0,
      closing: 0,
      listening: 0,
    };

    userSessions.forEach((s) => {
      const metrics = calculateSessionMetrics(s);
      avgScores.overall += metrics.overall;
      avgScores.discovery += metrics.discovery;
      avgScores.objection_handling += metrics.objection_handling;
      avgScores.positioning += metrics.positioning;
      avgScores.closing += metrics.closing;
      avgScores.listening += metrics.listening;
    });

    const count = userSessions.length;
    avgScores.overall = Math.round(avgScores.overall / count);
    avgScores.discovery = Math.round(avgScores.discovery / count);
    avgScores.objection_handling = Math.round(
      avgScores.objection_handling / count,
    );
    avgScores.positioning = Math.round(avgScores.positioning / count);
    avgScores.closing = Math.round(avgScores.closing / count);
    avgScores.listening = Math.round(avgScores.listening / count);

    const skillEntries = skills.map((skill) => ({
      skill,
      score: avgScores[skill],
    }));
    skillEntries.sort((a, b) => a.score - b.score);
    const weakestSkills = skillEntries.slice(0, 2).map((e) => e.skill);

    summaries.push({
      userName,
      sessionCount: count,
      avgScores,
      weakestSkills,
      recentTrend: calculateTrend(userSessions),
    });
  });

  return summaries;
}
