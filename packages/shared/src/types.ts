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

export interface SessionEvaluation {
  objectionHandlingScore: number;
  confidenceScore: number;
  clarityScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
}

export interface Session {
  id: string;
  personaId: string;
  productId: string;
  transcript: string;
  durationSeconds: number;
  evaluation: SessionEvaluation | null;
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
}

export interface EvaluateSessionResponse {
  objectionHandlingScore: number;
  confidenceScore: number;
  clarityScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface TokenResponse {
  apiKey: string;
}
