import type { Session, CallSession, Persona } from "../db";
import { getOverallScore } from "./scoring";

/**
 * Calculates average scores per persona.
 */
export function calculateCategoryScores(
  sessions: (Session | CallSession)[],
  category: "persona",
): { name: string; score: number }[] {
  const scores: Record<string, { total: number; count: number }> = {};

  sessions.forEach((s) => {
    const evaluation = "evaluation" in s ? s.evaluation : s.legacyEvaluation;
    if (!evaluation) return;

    const name = s.personaName || "Default Persona";

    if (!scores[name]) {
      scores[name] = { total: 0, count: 0 };
    }
    const scoreVal = getOverallScore(evaluation);
    scores[name].total += scoreVal;
    scores[name].count += 1;
  });

  return Object.entries(scores)
    .map(([name, data]) => ({
      name,
      score: Math.round(data.total / data.count),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Limit to top 5
}

/**
 * Calculates team training coverage across personas.
 */
export function calculateTeamCoverage(
  sessions: (Session | CallSession)[],
  personas: Persona[],
): {
  personaName: string;
  practiced: boolean;
  score: number;
}[] {
  if (personas.length === 0) return [];

  return personas.map((persona) => {
    const personaSessions = sessions.filter((s) => s.personaId === persona.id);
    const practiced = personaSessions.length > 0;

    let totalScore = 0;
    let evalCount = 0;

    personaSessions.forEach((s) => {
      const evaluation = "evaluation" in s ? s.evaluation : s.legacyEvaluation;
      if (evaluation) {
        totalScore += getOverallScore(evaluation);
        evalCount++;
      }
    });

    return {
      personaName: persona.name,
      practiced,
      score: evalCount > 0 ? Math.round(totalScore / evalCount) : 0,
    };
  });
}
