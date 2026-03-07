// ─── Core Domain Types ──────────────────────────────────────────────────────

export interface Product {
  id: string;
  userId: string;
  teamId?: string;
  companyName: string;
  description: string;
  targetCustomer: string;
  industry: string;
  objections: string[];
  createdAt: string;
}

export interface PersonaTraits {
  aggressiveness: number;
  interruptionFrequency: "low" | "medium" | "high";
  objectionStyle:
    | "analytical"
    | "emotional"
    | "authority-based"
    | "budget-focused";
}

export type PersonalityType =
  | "impatient-executive"
  | "analytical-buyer"
  | "budget-conscious-founder"
  | "emotional-decision-maker"
  | "skeptical-lead"
  | "competitor-user";

export interface ProspectPersonalityTemplate {
  type: PersonalityType;
  name: string;
  behavioralProfile: string;
  tone: string;
  patience: "low" | "medium" | "high";
  verbosity: "low" | "medium" | "high";
  objectionLikelihood: "low" | "medium" | "high";
  preferredSellingPoints: string[];
  emotionalTriggers: string[];
}

export interface Persona {
  id: string;
  productId: string;
  userId: string;
  teamId?: string;
  name: string;
  role: string;
  personalityPrompt: string;
  personalityType?: PersonalityType;
  intensityLevel: number; // 1-3
  objectionStrategy: string;
  gender: "male" | "female";
  traits: PersonaTraits;
  createdAt: string;
}

// ─── Timed Call Types ───────────────────────────────────────────────────────

export type CallDurationOption = 5 | 10 | 15;

export interface TranscriptMessage {
  role: "user" | "model" | "system";
  text: string;
  timestamp: number; // seconds since call start
}

// ─── Feedback Report Types ──────────────────────────────────────────────────

export interface FeedbackReport {
  overall_score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  objection_handling_score: number; // 0-100
  closing_effectiveness_score: number; // 0-100
  confidence_score: number; // 0-100
  suggested_improvements: string[];
}

export interface SessionEvaluation {
  objectionHandlingScore: number;
  confidenceScore: number;
  clarityScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
}

// ─── Training Track Types ───────────────────────────────────────────────────

export type TrainingTrackId =
  | "beginner-sales-rep"
  | "objection-mastery"
  | "enterprise-selling"
  | "closing-specialist";

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  prospectPersonaType: string;
  difficulty: 1 | 2 | 3;
  expectedSkills: string[];
  evaluationWeighting: {
    objection_handling: number;
    closing_effectiveness: number;
    confidence: number;
    rapport_building: number;
    discovery_skills: number;
  };
  systemPromptOverride: string; // extra instructions injected into the AI prompt
}

export interface TrainingTrack {
  id: TrainingTrackId;
  name: string;
  description: string;
  icon: string; // lucide icon name
  scenarios: ScenarioTemplate[];
}

// ─── Session Types ──────────────────────────────────────────────────────────

export interface Session {
  id: string;
  personaId: string;
  productId: string;
  teamId?: string;
  personaName?: string;
  personaRole?: string;
  personaAvatarUrl?: string;
  transcript: string;
  durationSeconds: number;
  evaluation: SessionEvaluation | null;
  debrief?: CoachDebriefResponse | null;
  createdAt: string;
}

// ─── Call Session (enhanced) ────────────────────────────────────────────────

export type CallStatus = "pending" | "active" | "ended";

export interface CallSession {
  id: string;
  userId: string;
  teamId?: string;
  personaId: string;
  productId: string;
  userName: string;
  personaName?: string;
  personaRole?: string;
  personaAvatarUrl?: string;

  // Timing
  callDurationMinutes: number; // selected duration in minutes
  callStartTime: string | null; // ISO timestamp when call actually started
  callEndTime: string | null; // ISO timestamp when call ended
  callStatus: CallStatus;

  // Training track
  trackId: TrainingTrackId | null;
  scenarioId: string | null;

  // Transcript
  transcriptMessages: TranscriptMessage[];

  // Feedback
  feedbackReport: FeedbackReport | null;
  legacyEvaluation: SessionEvaluation | null; // backward compat

  // Insights
  insights: { insight: string; timestamp: number }[];

  // Media
  audioUrl?: string;

  debrief?: CoachDebriefResponse | null;

  durationSeconds?: number;

  createdAt: string;
}

// ─── Progress Tracking Types ───────────────────────────────────────────────

export interface UserMetrics {
  userId: string;
  totalCalls: number;
  totalDurationSeconds: number;
  averageScore: number;
  practiceStreak: number;
  lastPracticeDate: string | null; // ISO Date
  objectionHandlingAverage: number;
  closingSuccessAverage: number;
  confidenceAverage: number;
  talkTimeRatioAverage: number; // 0-100
  tracksCompleted: TrainingTrackId[];
  updatedAt: string;
}

export interface ProgressReport {
  metrics: UserMetrics;
  historicalScores: { date: string; score: number }[];
  tips: string[];
}

// ─── API Request / Response Types ───────────────────────────────────────────

export interface GeneratePersonaRequest {
  companyName: string;
  description: string;
  targetCustomer: string;
  industry: string;
  objections: string[];
  personalityType?: PersonalityType;
}

export interface GeneratePersonaResponse {
  name: string;
  role: string;
  gender: "male" | "female";
  personalityPrompt: string;
  personalityType?: PersonalityType;
  intensityLevel: number;
  objectionStrategy: string;
  traits: PersonaTraits;
}

export interface EvaluateSessionRequest {
  transcript: string;
  personaName: string;
  personaRole: string;
  intensityLevel: number;
  durationSeconds: number;
  trackId?: TrainingTrackId;
  scenarioId?: string;
}

export interface EvaluateSessionResponse {
  objectionHandlingScore: number;
  confidenceScore: number;
  clarityScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
}

export interface FeedbackReportRequest {
  transcript: string;
  personaName: string;
  personaRole: string;
  intensityLevel: number;
  durationSeconds: number;
  trackId?: TrainingTrackId;
  scenarioId?: string;
}

export interface FeedbackReportResponse extends FeedbackReport {}

export interface GenerateProductRequest {
  companyName?: string;
  briefDescription?: string;
}

export interface GenerateProductResponse {
  companyName: string;
  description: string;
  targetCustomer: string;
  industry: string;
  objections: string[];
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface TokenResponse {
  apiKey: string;
}

// ─── Coach Debrief Types ───────────────────────────────────────────────────

export type DebriefSlideType = "overview" | "problem" | "correction" | "drill";

export interface DebriefSlide {
  title: string;
  narration: string; // Max 20 seconds
  visual: string; // Description for Imagen infographic
  type: DebriefSlideType;
  visualBase64?: string; // AI-generated infographic (base64)
  visualUrl?: string; // AI-generated infographic (Storage URL)
}

export interface CoachDebriefResponse {
  slides: DebriefSlide[];
  audioBase64?: string[]; // Corresponding base64 audio for each slide (usually from API)
  visualBase64?: string[]; // AI-generated infographics as base64
  audioUrls?: string[]; // Remote URLs stored in Firebase Storage
  visualUrls?: string[]; // Remote URLs for AI-generated infographics
}

// ─── Team & Membership Types ────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface TeamMember {
  id: string; // teamId_userId
  teamId: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  role: "admin" | "member";
  joinedAt: string;
}

export interface Invitation {
  id: string; // token
  teamId: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "expired";
  invitedBy: string; // userId
  expiresAt: string;
}
