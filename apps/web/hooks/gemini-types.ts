export type RoleGroup = "user" | "model";

export const Modality = {
  AUDIO: "AUDIO",
  TEXT: "TEXT",
} as const;

export interface TranscriptEntry {
  role: "user" | "model";
  text: string;
  timestamp: number;
  startTime?: number; // When this entry started (for user slow reveal)
  isStreaming?: boolean;
  isInterrupted?: boolean;
}

export interface SalesInsight {
  insight: string;
  timestamp: number;
}

export interface ObjectionLog {
  objectionType: string;
  repResponse: string;
  sentiment: "positive" | "neutral" | "negative";
  timestamp: number;
}

export interface PersonaMood {
  trust: number;
  interest: number;
  frustration: number;
  dealLikelihood: number;
  timestamp: number;
}
