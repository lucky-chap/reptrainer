/** Gemini model used for text generation (persona, evaluation) */
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

/** Gemini model used for evaluation */
export const GEMINI_EVALUATION_MODEL = "gemini-2.5-flash";

/** Gemini model used for the Multimodal Live API (WebSocket) */
export const GEMINI_LIVE_MODEL = "gemini-live-2.5-flash-native-audio";

/** Gemini model used for voice generation */
export const GEMINI_VOICE_MODEL = "gemini-2.5-flash-preview-tts";

/** Gemini voice name */
export const GEMINI_VOICE_NAME = "Zephyr";

/** Gemini model used for avatar generation */
export const GEMINI_IMAGE_MODEL = "imagen-4.0-generate-001";

/** Scoring range */
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

/** Persona intensity levels */
export const MIN_INTENSITY = 1;
export const MAX_INTENSITY = 3;

/** Call duration constraints (in minutes) */
export const CALL_DURATION_OPTIONS = [5, 10, 15] as const;
export const CALL_DURATION_MIN = 5;
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

/** Prospect Personality Templates */
export const PROSPECT_PERSONALITY_TEMPLATES: any[] = [
  {
    type: "impatient-executive",
    name: "Impatient Executive",
    behavioralProfile:
      "Extremely time-conscious, gets straight to the point, and interrupts if the pitch is too slow. Hates fluff and marketing speak.",
    tone: "Direct and assertive",
    patience: "low",
    verbosity: "low",
    objectionLikelihood: "medium",
    preferredSellingPoints: ["Efficiency", "Speed to value", "ROI"],
    emotionalTriggers: ["Wasted time", "Losing competitive edge"],
  },
  {
    type: "analytical-buyer",
    name: "Analytical Buyer",
    behavioralProfile:
      "Deeply investigative, demands data and proof for every claim. Will drill down into technical details and edge cases.",
    tone: "Objective and cautious",
    patience: "high",
    verbosity: "medium",
    objectionLikelihood: "high",
    preferredSellingPoints: ["Technical specs", "Data accuracy", "Scalability"],
    emotionalTriggers: ["Inconsistent data", "Over-promising"],
  },
  {
    type: "budget-conscious-founder",
    name: "Budget-Conscious Founder",
    behavioralProfile:
      "Treats company money like their own. Obsessed with cost-saving and immediate return on investment.",
    tone: "Frugal and pragmatic",
    patience: "medium",
    verbosity: "medium",
    objectionLikelihood: "high",
    preferredSellingPoints: [
      "Cost reduction",
      "Lean operations",
      "Flexible pricing",
    ],
    emotionalTriggers: ["Hidden costs", "Long payback periods"],
  },
  {
    type: "emotional-decision-maker",
    name: "Emotional Decision Maker",
    behavioralProfile:
      "Focuses on relationships and how the product impacts the team's daily life. Values trust and social proof over hard specs.",
    tone: "Warm and expressive",
    patience: "high",
    verbosity: "high",
    objectionLikelihood: "low",
    preferredSellingPoints: [
      "Ease of use",
      "User adoption",
      "Customer support",
    ],
    emotionalTriggers: ["Team frustration", "Lack of support"],
  },
  {
    type: "skeptical-lead",
    name: "Skeptical Lead",
    behavioralProfile:
      "Has heard it all before. Doesn't believe any AI hype and needs significant social proof and white papers to even listen.",
    tone: "Doubtful and reserved",
    patience: "medium",
    verbosity: "low",
    objectionLikelihood: "high",
    preferredSellingPoints: [
      "Proven track record",
      "Case studies",
      "Third-party validation",
    ],
    emotionalTriggers: ["Buzzwords", "Unsubstantiated claims"],
  },
  {
    type: "competitor-user",
    name: "Existing Competitor User",
    behavioralProfile:
      "Happy with their current tool and sees no reason to switch. Will constantly compare your features to what they already have.",
    tone: "Comparative and satisfied",
    patience: "medium",
    verbosity: "medium",
    objectionLikelihood: "high",
    preferredSellingPoints: [
      "Differentiators",
      "Migration ease",
      "Superior UX",
    ],
    emotionalTriggers: ["Status quo", "High switching costs"],
  },
];
