"use server";

import { CoachDebriefResponse } from "@reptrainer/shared";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const secretKey = process.env.API_SECRET_KEY || "reptrainer-secret-123";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${secretKey}`,
};

export async function fetchAuthToken(
  systemPrompt?: string,
  voiceName?: string,
) {
  const res = await fetch(`${baseUrl}/api/auth/token`, {
    method: "POST",
    headers,
    body: JSON.stringify({ systemPrompt, voiceName }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch auth token: ${res.statusText}`);
  }
  return res.json();
}

export async function generatePersona(data: {
  companyName: string;
  description: string;
  targetCustomer: string;
  industry: string;
  objections: string[];
  personalityType?: string;
  gender?: "male" | "female" | "other";
  ethnicity?: string;
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

export async function generateProduct(data: {
  companyName?: string;
  briefDescription?: string;
}) {
  const res = await fetch(`${baseUrl}/api/product/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate product: ${res.statusText}`);
  }
  return res.json();
}

export async function generatePersonaAvatar(data: {
  gender: "male" | "female" | "other";
  role: string;
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
