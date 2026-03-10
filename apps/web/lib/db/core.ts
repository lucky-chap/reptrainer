import { updateDoc as firestoreUpdateDoc } from "firebase/firestore";

export const updateDoc = firestoreUpdateDoc;
import { db as firestoreDb, storage as firebaseStorage } from "../firebase";
export const db = firestoreDb;
export const storage = firebaseStorage;
import type {
  Team,
  TeamMember,
  Invitation,
  PersonalityType,
  DifficultyLevel,
  SkillEvaluation,
  CoachDebriefResponse,
  CallSession,
  CallStatus,
  FeedbackReport,
  TranscriptMessage,
  UserMetrics,
  TrainingTrackId,
  ProgressReport,
} from "@reptrainer/shared";

// ─── Data Models ───

export interface Product {
  id: string;
  userId: string;
  teamId: string;
  companyName: string;
  description: string;
  targetCustomer: string;
  industry: string;
  objections: string[];
  createdAt: string;
}

export interface Persona {
  id: string;
  userId: string;
  teamId: string;
  productId: string;
  name: string;
  role: string;
  personalityPrompt: string;
  intensityLevel: number; // 1-3
  objectionStrategy: string;
  gender: "male" | "female" | "other";
  country?: string;
  languageCode?: string;
  voiceName?: string;
  personalityType?: PersonalityType;
  avatarUrl?: string;
  traits: {
    aggressiveness: number;
    interruptionFrequency: string;
    objectionStyle: string;
  };
  createdAt: string;

  // Rich Persona Fields
  companyType?: string;
  industry?: string;
  seniorityLevel?: string;
  personalityTraits?: string[];
  motivations?: string[];
  objections?: string[];
  speakingStyle?: string;
  accent?: string;
  communicationStyle?: string;
  emotionalState?: string;
  environmentContext?: string;
  timePressure?: string;
  conversationBehavior?: string[];
  buyingAttitude?: string;
  difficultyLevel?: DifficultyLevel;
  physicalDescription?: string;
}

export interface SessionEvaluation {
  discovery: SkillEvaluation;
  objectionHandling: SkillEvaluation;
  productPositioning: SkillEvaluation;
  closing: SkillEvaluation;
  activeListening: SkillEvaluation;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
}

export interface Session {
  id: string;
  userId: string;
  personaId: string;
  teamId?: string;
  userName?: string;
  productId: string;
  personaName?: string;
  personaRole?: string;
  personaAvatarUrl?: string;
  transcript: string;
  durationSeconds: number;
  evaluation: SessionEvaluation | null;
  createdAt: string;
  insights?: { insight: string; timestamp: number }[];
  audioUrl?: string; // Changed from audioBlob for Firestore/Storage
  debrief?: CoachDebriefResponse | null;
}

// Re-export shared types for convenience
export type {
  Team,
  TeamMember,
  Invitation,
  PersonalityType,
  DifficultyLevel,
  SkillEvaluation,
  CoachDebriefResponse,
  CallSession,
  CallStatus,
  FeedbackReport,
  TranscriptMessage,
  UserMetrics,
  TrainingTrackId,
  ProgressReport,
};
