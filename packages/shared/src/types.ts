// ─── Core Domain Types ──────────────────────────────────────────────────────

export interface Product {
  id: string;
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

export interface Persona {
  id: string;
  productId: string;
  name: string;
  role: string;
  personalityPrompt: string;
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

// ─── API Request / Response Types ───────────────────────────────────────────

export interface GeneratePersonaRequest {
  companyName: string;
  description: string;
  targetCustomer: string;
  industry: string;
  objections: string[];
}

export interface GeneratePersonaResponse {
  name: string;
  role: string;
  gender: "male" | "female";
  personalityPrompt: string;
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
  visual: string; // Description for CSS/SVG diagram
  type: DebriefSlideType;
}

export interface CoachDebriefResponse {
  slides: DebriefSlide[];
  audioBase64: string[]; // Corresponding base64 audio for each slide
}
