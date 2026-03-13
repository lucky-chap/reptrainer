// ─── Core Domain Types ──────────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: string;
  storageUrl: string;
  createdAt: string;
  ragFileId?: string;
}

export interface KnowledgeBase {
  teamId: string;
  documents: KnowledgeDocument[];
  embeddingsIndexStatus: "idle" | "processing" | "ready" | "failed";
  vectorIndexId?: string;
  ragCorpusId?: string;
  updatedAt: string;
}

export interface KnowledgeMetadata {
  teamId: string;
  productCategory: string;
  icp: string; // Ideal Customer Profile
  buyerRoles: string[];
  competitors: string[];
  competitorContexts?: CompetitorContext[];
  differentiators: string[];
  valueProps: string[];
  objections: string[];
  updatedAt: string;
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

export interface CompetitorContext {
  name: string;
  website?: string;

  productDescription: string;
  targetCustomer: string;
  pricingPositioning: string;
  painPoints: string[];
  complaints: string[];
}

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface Persona {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  role: string;

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
  competitorContext?: CompetitorContext;

  // Legacy/Behavioral fields
  personalityPrompt: string;
  personalityType?: PersonalityType;
  intensityLevel: number; // 1-3
  objectionStrategy: string;
  gender: "male" | "female";
  country?: string;
  languageCode?: string;
  voiceName?: string;
  avatarUrl?: string; // Added avatarUrl as it's used in RoleplaySession
  physicalDescription?: string;
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

export interface SkillEvaluation {
  score: number;
  explanation: string;
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

// ─── Training Track Types ───────────────────────────────────────────────────

export type TrainingTrackId =
  | "beginner-sales-rep"
  | "objection-mastery"
  | "enterprise-selling"
  | "closing-specialist"
  | "adaptive";

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
  teamId: string;
  personaName?: string;
  personaRole?: string;
  personaAvatarUrl?: string;
  transcript: string;
  durationSeconds: number;
  evaluation: SessionEvaluation | null;
  debrief?: CoachDebriefResponse | null;
  objections?: any[];
  moods?: any[];
  createdAt: string;
}

// ─── Call Session (enhanced) ────────────────────────────────────────────────

export type CallStatus = "pending" | "active" | "ended";
export type DebriefStatus = "pending" | "generating" | "ready" | "failed";

export interface CallSession {
  id: string;
  userId: string;
  teamId: string;
  personaId: string;
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
  debriefStatus?: DebriefStatus;
  objections?: any[];
  moods?: any[];
  durationSeconds?: number;

  createdAt: string;
}

// ─── Progress Tracking Types ───────────────────────────────────────────────

export interface UserMetrics {
  userId: string;
  teamId: string;
  totalCalls: number;
  totalDurationSeconds: number;
  averageScore: number;
  practiceStreak: number;
  lastPracticeDate: string | null; // ISO Date
  objectionHandlingAverage: number;
  closingSuccessAverage: number; // legacy
  confidenceAverage: number; // legacy
  discoveryAverage: number;
  productPositioningAverage: number;
  closingAverage: number;
  activeListeningAverage: number;
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
  teamId: string;
  personalityType?: PersonalityType;
  gender?: "male" | "female" | "other";
  country?: string;
  companyName?: string;
}

export interface GeneratePersonaResponse {
  name: string;
  role: string;
  gender: "male" | "female";
  voiceName: string;
  personalityPrompt: string;
  personalityType?: PersonalityType;
  intensityLevel: number;
  objectionStrategy: string;
  traits: PersonaTraits;
  languageCode: string; // The BCP-47 language code for Gemini Live (e.g., 'en', 'es', 'ja')

  // Rich Persona Fields
  companyType: string;
  industry: string;
  seniorityLevel: string;
  personalityTraits: string[];
  motivations: string[];
  objections: string[];
  speakingStyle: string;
  accent: string;
  communicationStyle: string;
  emotionalState: string;
  environmentContext: string;
  timePressure: string;
  conversationBehavior: string[];
  buyingAttitude: string;
  difficultyLevel: DifficultyLevel;
  physicalDescription: string;
}

export interface EvaluateSessionRequest {
  transcript: string;
  personaName: string;
  personaRole: string;
  intensityLevel: number;
  durationSeconds: number;
  trackId?: TrainingTrackId;
  scenarioId?: string;
  teamId?: string;
}

export interface EvaluateSessionResponse extends SessionEvaluation {}

export interface FeedbackReportRequest {
  transcript: string;
  personaName: string;
  personaRole: string;
  intensityLevel: number;
  durationSeconds: number;
  trackId?: TrainingTrackId;
  scenarioId?: string;
  teamId?: string;
}

export interface FeedbackReportResponse extends FeedbackReport {}

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
  hasKnowledgeBase: boolean;
  companyName?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string; // teamId_userId
  teamId: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  role: "admin" | "member";
  status: "active" | "removed";
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
