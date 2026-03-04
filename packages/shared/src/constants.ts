/** Gemini model used for text generation (persona, evaluation) */
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

/** Gemini model used for evaluation */
export const GEMINI_EVALUATION_MODEL = "gemini-2.5-flash";

/** Gemini model used for the Multimodal Live API (WebSocket) */
export const GEMINI_LIVE_MODEL = "gemini-live-2.5-flash-native-audio";

/** Scoring range */
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

/** Persona intensity levels */
export const MIN_INTENSITY = 1;
export const MAX_INTENSITY = 3;

/** Call duration constraints (in minutes) */
export const CALL_DURATION_OPTIONS = [5, 10, 15] as const;
export const CALL_DURATION_MIN = 2;
export const CALL_DURATION_MAX = 30;
export const CALL_DURATION_DEFAULT = 5;

/** Warning threshold (seconds before end) */
export const CALL_WARNING_THRESHOLD_SECONDS = 45;

/** API route paths (relative) */
export const API_ROUTES = {
  AUTH_TOKEN: "/api/auth/token",
  PERSONA_GENERATE: "/api/persona/generate",
  SESSION_EVALUATE: "/api/session/evaluate",
  SESSION_FEEDBACK: "/api/session/feedback",
} as const;
