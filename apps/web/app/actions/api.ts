"use server";

import { CoachDebriefResponse } from "@reptrainer/shared";
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

export async function generatePersonaAvatar(data: {
  gender: "male" | "female" | "other";
  role: string;
  country?: string;
  physicalDescription?: string;
}) {
  const res = await fetch(`${baseUrl}/api/persona/generate-avatar`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate persona avatar: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Generate a personalized coach debrief (4 slides) with voiceover.
 */
export async function generateCoachDebrief(data: {
  transcript: string;
  personaName: string;
  personaRole: string;
  durationSeconds: number;
  objections?: any[];
  moods?: any[];
}): Promise<CoachDebriefResponse> {
  const res = await fetch(`${baseUrl}/api/session/debrief`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    if (res.status === 400) {
      const error = await res.json();
      throw new Error(error.error || "Failed to generate coach debrief");
    }
    throw new Error(`Failed to generate coach debrief: ${res.statusText}`);
  }
  return res.json() as Promise<CoachDebriefResponse>;
}
