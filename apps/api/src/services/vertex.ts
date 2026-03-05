import {
  VertexAI,
  GenerationConfig,
  type ModelParams,
} from "@google-cloud/vertexai";
import { env } from "../config/env.js";
import {
  GeneratePersonaRequest,
  GeneratePersonaResponse,
  EvaluateSessionRequest,
  EvaluateSessionResponse,
  GEMINI_TEXT_MODEL,
  GEMINI_EVALUATION_MODEL,
  GEMINI_LIVE_MODEL,
} from "@reptrainer/shared";

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
});

const TEXT_MODEL = GEMINI_TEXT_MODEL; // Stable Vertex model
const EVALUATION_MODEL = GEMINI_EVALUATION_MODEL; // Stable Vertex model

/**
 * Extracts JSON from a potentially markdown-wrapped AI response.
 */
function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Generate a buyer persona using Vertex AI based on product context.
 */
export async function generatePersona(
  input: GeneratePersonaRequest,
): Promise<GeneratePersonaResponse> {
  const { companyName, description, targetCustomer, industry, objections } =
    input;

  const model = vertexAI.getGenerativeModel({
    model: TEXT_MODEL,
    generationConfig: {
      temperature: 1.2,
      responseMimeType: "application/json",
    } as GenerationConfig,
  });

  const prompt = `You are a sales training AI. Generate a realistic, challenging buyer persona for a high-pressure sales roleplay session.

Context:
- Company being pitched: ${companyName}
- Product: ${description}
- Target Customer: ${targetCustomer}
- Industry: ${industry}
- Common Objections: ${objections.join(", ")}

Generate a buyer persona with the following JSON structure. Return ONLY valid JSON:
{
  "name": "A realistic, memorable full name. Use culturally diverse names — mix ethnicities and backgrounds. Examples: 'Priya Raghavan', 'Marcus Okonkwo', 'Elena Vasquez', 'James Whitfield', 'Aisha Patel', 'Tomoko Nakamura', 'David Kofi Mensah', 'Carolina Ferro'. Avoid generic names like 'John Smith' or 'Jane Doe'. The name should feel like a real executive you'd meet at a Fortune 500 company.",
  "role": "A specific, realistic job title (e.g., 'SVP of Revenue Operations', 'Chief Data Officer', 'Director of IT Infrastructure'). Avoid generic titles like 'Manager'.",
  "gender": "male" or "female" (must match the name),
  "personalityPrompt": "A detailed system prompt (5-8 sentences) describing how this persona behaves in sales meetings. Include: their communication style (direct, analytical, impatient, etc.), what triggers their skepticism, specific pet peeves in sales pitches (e.g., 'hates buzzwords', 'demands ROI before features'), their decision-making approach (consensus-driven, data-driven, gut-feel), and what would make them end a meeting early. Make the persona feel like a real, specific person with strong opinions.",
  "intensityLevel": 1-3 (1=friendly skeptic, 2=tough negotiator, 3=hostile gatekeeper),
  "objectionStrategy": "A specific 2-3 sentence strategy this persona uses to push back. E.g., 'Opens with budget concerns, then escalates to questioning whether the product solves a real problem. Will demand competitive comparisons and walk if the rep can't provide them.'",
  "traits": {
    "aggressiveness": 1-3,
    "interruptionFrequency": "low" | "medium" | "high",
    "objectionStyle": "analytical" | "emotional" | "authority-based" | "budget-focused"
  }
}

IMPORTANT:
- Vary the gender across generations — create a realistic mix of male and female personas.
- The name MUST clearly match the gender field.
- Make the name MEMORABLE and DISTINCT.
- Vary cultural backgrounds. Do NOT default to generic Anglo-Saxon names every time.`;

  const response = await model.generateContent(prompt);
  const text = response.response.candidates?.[0].content.parts?.[0].text ?? "";
  const jsonStr = extractJson(text);

  if (!jsonStr) {
    throw Object.assign(
      new Error("Failed to generate persona. Invalid JSON response from AI."),
      { statusCode: 502 },
    );
  }

  return JSON.parse(jsonStr) as GeneratePersonaResponse;
}

/**
 * Evaluate a sales roleplay session transcript using Vertex AI.
 */
export async function evaluateSession(
  input: EvaluateSessionRequest,
): Promise<EvaluateSessionResponse> {
  const {
    transcript,
    personaName,
    personaRole,
    intensityLevel,
    durationSeconds,
  } = input;

  const model = vertexAI.getGenerativeModel({
    model: EVALUATION_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
    } as GenerationConfig,
  });

  const prompt = `You are an expert sales performance evaluator and coach. Analyze the following sales roleplay transcript and provide a structured evaluation.

Persona Context:
- Buyer Name: ${personaName}
- Buyer Role: ${personaRole}
- Difficulty Level: ${intensityLevel}/3
- Call Duration: ${Math.round(durationSeconds / 60)} minutes

Transcript:
${transcript}

Evaluate the sales rep's performance on these criteria:
1. **Objection Handling** (1-10): Did the rep directly address objections? Did they acknowledge concerns before responding? Did they handle pushback confidently?
2. **Confidence** (1-10): Did the rep speak with authority? Did they avoid hedging or being overly apologetic? Did they maintain composure under pressure?
3. **Clarity** (1-10): Was the rep concise? Did they quantify value? Did they avoid rambling or going off-topic?

Also identify:
- 3-5 specific strengths
- 3-5 specific weaknesses
- 3-5 actionable improvement tips

Return ONLY valid JSON in this format:
{
  "objectionHandlingScore": <number 1-10>,
  "confidenceScore": <number 1-10>,
  "clarityScore": <number 1-10>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "improvementTips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}`;

  const response = await model.generateContent(prompt);
  const text = response.response.candidates?.[0].content.parts?.[0].text ?? "";
  const jsonStr = extractJson(text);

  if (!jsonStr) {
    throw Object.assign(
      new Error("Failed to evaluate session. Invalid JSON response from AI."),
      { statusCode: 502 },
    );
  }

  return JSON.parse(jsonStr) as EvaluateSessionResponse;
}

/**
 * Get the setup configuration for Vertex AI Multimodal Live.
 */
export function getLiveSetupConfig(
  project: string,
  location: string,
  systemPrompt: string,
  voiceName: string = "Kore",
) {
  return {
    setup: {
      model: `projects/${project}/locations/${location}/publishers/google/models/${GEMINI_LIVE_MODEL}`,
      generation_config: {
        response_modalities: ["AUDIO"],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: voiceName,
            },
          },
        },
      },
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      input_audio_transcription: {},
      output_audio_transcription: {},
      realtime_input_config: {
        automatic_activity_detection: {
          silence_duration_ms: 2000,
          start_of_speech_sensitivity: "START_SENSITIVITY_HIGH",
          end_of_speech_sensitivity: "END_SENSITIVITY_LOW",
        },
      },
      tools: [
        {
          google_search: {},
        },
        {
          function_declarations: [
            {
              name: "log_sales_insight",
              description:
                "Record a key insight or moment from the sales call for later review.",
              parameters: {
                type: "object",
                properties: {
                  insight: {
                    type: "string",
                    description: "The description of the sales insight.",
                  },
                  timestamp: {
                    type: "number",
                    description:
                      "The timestamp in seconds from the start of the call.",
                  },
                },
                required: ["insight"],
              },
            },
            {
              name: "end_roleplay",
              description:
                "End the sales roleplay session. IMPORTANT: You MUST first speak a complete, natural closing phrase out loud (e.g. 'Thank you for your time, I appreciate the presentation but we're going to pass.') and WAIT until you have fully finished speaking before calling this tool. Do NOT call this tool mid-sentence or before your goodbye is complete.",
              parameters: {
                type: "object",
                properties: {},
              },
            },
          ],
        },
      ],
    },
  };
}

/**
 * Generate a persona avatar image using Vertex AI Imagen 4.0.
 * Returns the base64 encoded image or a public URL.
 */
export async function generatePersonaAvatar(
  gender: string,
  role: string,
): Promise<string> {
  const project = env.GOOGLE_CLOUD_PROJECT;
  const location = env.GOOGLE_CLOUD_LOCATION;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/imagen-4.0-generate-001:predict`;

  const prompt = `A professional, photorealistic headshot portrait of a ${gender} executive in their 40s, job title: ${role}. High-end corporate photography, soft studio lighting, blurred office background, neutral professional attire. Highly detailed features.`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        mimeType: "image/jpeg",
        compressionQuality: 80,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Imagen API Error:", errorBody);
    throw new Error(`Failed to generate avatar: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    predictions?: Array<{
      bytesBase64?: string;
      bytesBase64Encoded?: string;
    }>;
  };

  // Log structure for debugging if we get no data
  if (!data.predictions?.[0]) {
    console.error("Imagen API returned no predictions:", JSON.stringify(data));
  }

  const base64Image =
    data.predictions?.[0]?.bytesBase64Encoded ||
    data.predictions?.[0]?.bytesBase64;

  if (!base64Image) {
    console.error(
      "No image data in first prediction. Keys found:",
      Object.keys(data.predictions?.[0] || {}),
    );
    throw new Error("No image data returned from Imagen API");
  }

  return `data:image/jpeg;base64,${base64Image}`;
}

async function getAccessToken() {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}
