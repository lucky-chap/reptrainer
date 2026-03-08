export type RoleGroup = "user" | "model";

export const Modality = {
  AUDIO: "AUDIO",
  TEXT: "TEXT",
} as const;

export interface TranscriptEntry {
  role: "user" | "model";
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  isInterrupted?: boolean;
}

export interface SalesInsight {
  insight: string;
  timestamp: number;
}
