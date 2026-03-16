"use server";

import env from "@/config/env";

const baseUrl = env.NEXT_PUBLIC_API_URL;
const secretKey = env.NEXT_PUBLIC_API_SECRET_KEY;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${secretKey}`,
};

export async function generatePersona(data: {
  teamId: string;
  personalityType?: string;
  gender?: "male" | "female" | "other";
  country?: string;
  competitorUrl?: string;
  companyName?: string;
}) {
  const res = await fetch(`${baseUrl}/api/persona/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate persona: ${res.statusText}`);
  }
  return res.json();
}

export async function evaluateSession(data: {
  transcript: string;
  personaName: string;
  personaRole: string;
  intensityLevel: number;
  durationSeconds: number;
  trackId?: string;
  scenarioId?: string;
}) {
  const res = await fetch(`${baseUrl}/api/session/evaluate`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to evaluate session: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Generate a detailed, structured feedback report for a completed call.
 * Returns the enhanced FeedbackReport with overall_score, strengths,
 * weaknesses, missed_opportunities, and sub-scores.
 */
export async function generateFeedbackReport(data: {
  transcript: string;
  personaName: string;
  personaRole: string;
  intensityLevel: number;
  durationSeconds: number;
  trackId?: string;
  scenarioId?: string;
}) {
  const res = await fetch(`${baseUrl}/api/session/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate feedback report: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRAGCoachingInsights(data: {
  teamId: string;
  isTeamView: boolean;
  scoreSummaries: {
    userName: string;
    sessionCount: number;
    avgScores: {
      overall: number;
      discovery: number;
      objection_handling: number;
      positioning: number;
      closing: number;
      listening: number;
    };
    weakestSkills: string[];
    recentTrend: "improving" | "declining" | "stable";
  }[];
}) {
  const res = await fetch(`${baseUrl}/api/session/coaching-insights`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch RAG coaching insights: ${res.statusText}`);
  }
  return res.json();
}
