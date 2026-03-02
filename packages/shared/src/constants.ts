// ─── Shared Constants ───────────────────────────────────────────────────────

/** Gemini model used for text generation (persona, evaluation) */
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

/** Scoring range */
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

/** Persona intensity levels */
export const MIN_INTENSITY = 1;
export const MAX_INTENSITY = 3;

/** API route paths (relative) */
export const API_ROUTES = {
  AUTH_TOKEN: "/api/auth/token",
  PERSONA_GENERATE: "/api/persona/generate",
  SESSION_EVALUATE: "/api/session/evaluate",
} as const;
