import {
  VertexAI,
  GenerationConfig,
  type ModelParams,
} from "@google-cloud/vertexai";
import { GoogleGenAI, type LiveConnectConfig } from "@google/genai";
import { env } from "../config/env.js";
import {
  GeneratePersonaRequest,
  GeneratePersonaResponse,
  EvaluateSessionRequest,
  EvaluateSessionResponse,
  GEMINI_TEXT_MODEL,
  GEMINI_EVALUATION_MODEL,
  GEMINI_LIVE_MODEL,
  GEMINI_IMAGE_MODEL,
  type CompetitorContext,
} from "@reptrainer/shared";
import { uploadAvatar } from "./storage.js";

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
});

const genAI = new GoogleGenAI({
  vertexai: true,
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
});

const TEXT_MODEL = GEMINI_TEXT_MODEL; // Stable Vertex model
const EVALUATION_MODEL = GEMINI_EVALUATION_MODEL; // Stable Vertex model

const FEMALE_VOICES = [
  "Zephyr",
  "Kore",
  "Leda",
  "Aoede",
  "Callirrhoe",
  "Autonoe",
  "Despina",
  "Erinome",
  "Laomedeia",
  "Achernar",
  "Pulcherrima",
  "Achird",
  "Vindemiatrix",
  "Sulafat",
];

const MALE_VOICES = [
  "Puck",
  "Charon",
  "Fenrir",
  "Orus",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Algieba",
  "Algenib",
  "Rasalgethi",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Zubenelgenubi",
  "Sadachbia",
  "Sadaltager",
];

/**
 * Extracts JSON from a potentially markdown-wrapped AI response.
 */
function extractJson(text: string): string | null {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Researches a competitor based on their website URL using Google Search grounding.
 */
export async function researchCompetitor(
  url: string,
): Promise<CompetitorContext> {
  const prompt = `Research the competitor at this website: ${url}
  Identify their:
  1. Product description and core value proposition.
  2. Target customer segments.
  3. Pricing positioning (enterprise, budget, mid-market).
  4. Common customer pain points or limitations.
  5. Frequent customer complaints from review sites.

  Generate a competitor analysis with the following JSON structure. Return ONLY valid JSON:
  {
    "website": "${url}",
    "productDescription": "...",
    "targetCustomer": "...",
    "pricingPositioning": "...",
    "painPoints": ["..."],
    "complaints": ["..."]
  }`;

  const response = await genAI.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [
        {
          // @ts-ignore - googleSearch is a valid tool in @google/genai for Vertex AI grounding
          googleSearch: {},
        },
      ],
    },
  });

  const text = response.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : null;

  if (!jsonStr) {
    throw new Error(
      "Failed to research competitor using Vertex Search. Invalid research data.",
    );
  }

  return JSON.parse(jsonStr) as CompetitorContext;
}

/**
 * Generate a buyer persona using Vertex AI based on product context.
 */
export async function generatePersona(
  input: GeneratePersonaRequest,
): Promise<GeneratePersonaResponse> {
  const {
    companyName,
    description,
    targetCustomer,
    industry,
    objections,
    gender,
  } = input;

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
  "voiceName": "Choose one from the context-appropriate list based on the gender: ${gender === "male" ? MALE_VOICES.join(", ") : gender === "female" ? FEMALE_VOICES.join(", ") : [...MALE_VOICES, ...FEMALE_VOICES].join(", ")}",
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

Evaluate the sales rep's performance on these 5 specific skills (Score 0-100):
1. **Discovery Questions**: Did the rep ask open-ended questions to uncover pain points, budget, and decision-making processes?
2. **Objection Handling**: Did the rep effectively acknowledge concerns and provide persuasive rebuttals to pushback?
3. **Product Positioning**: Did the rep align product features with the buyer's specifically mentioned needs and value drivers? 
4. **Closing**: Did the rep clearly define next steps or ask for the business at the appropriate time?
5. **Active Listening**: Did the rep demonstrate understanding by summarizing, mirroring, or reacting appropriately to the buyer's cues?

Also identify:
- 3-5 specific strengths
- 3-5 specific weaknesses
- 3-5 actionable improvement tips
- An overall score (0-100) based on weighted performance.

Return ONLY valid JSON in this format:
{
  "discovery": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "objectionHandling": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "productPositioning": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "closing": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "activeListening": { "score": <0-100>, "explanation": "<brief 1-sentence explanation>" },
  "overallScore": <0-100>,
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
        parts: [
          {
            text: "You are in a live multimodal conversational environment. Your output is audio-only. Be concise, direct, and maintain your persona naturally. Your responses should generally be 1-3 sentences unless asked for detail. You can interrupt the user if they are rambling or avoiding questions.",
          },
          { text: systemPrompt },
        ],
      },
      input_audio_transcription: {},
      output_audio_transcription: {},
      realtime_input_config: {
        automatic_activity_detection: {
          silence_duration_ms: 1200,
          start_of_speech_sensitivity: "START_SENSITIVITY_HIGH",
          end_of_speech_sensitivity: "END_SENSITIVITY_MEDIUM",
        },
      },
      tools: [
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
 * Generate an image using Imagen 3 via Vertex AI REST API
 * Returns the image buffer.
 */
async function generateImage(prompt: string): Promise<Buffer> {
  const project = env.GOOGLE_CLOUD_PROJECT;
  const location = env.GOOGLE_CLOUD_LOCATION;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${GEMINI_IMAGE_MODEL}:predict`;

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
        // Imagen 3 supports different aspect ratios, we'll use 1:1 for avatars
        aspectRatio: "1:1",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Imagen API Error:", errorBody);
    throw new Error(`Failed to generate image: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    predictions?: Array<{
      bytesBase64Encoded?: string;
    }>;
  };

  const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

  if (!base64Image) {
    console.error(
      "No image data in first prediction. Keys found:",
      Object.keys(data.predictions?.[0] || {}),
    );
    throw new Error("No image data returned from Imagen API");
  }

  return Buffer.from(base64Image, "base64");
}

/**
 * Generate a persona avatar image using Gemini 3.1 Flash Image Preview and store in Firebase.
 * Returns the permanent storage URL.
 */
export async function generatePersonaAvatar(
  gender: string,
  role: string,
): Promise<string> {
  const prompt = `A professional, photorealistic headshot portrait of a ${gender} executive in their early 40s, job title: ${role}. High-end corporate photography, soft studio lighting, blurred office background, neutral professional attire. Highly detailed features.`;

  console.log(`Generating avatar for ${gender} ${role}...`);
  const imageBuffer = await generateImage(prompt);

  console.log("Uploading avatar to Firebase Storage...");
  const publicUrl = await uploadAvatar(imageBuffer);

  return publicUrl;
}

/**
 * Generate a coaching infographic using Vertex AI Imagen 4.0.
 * Returns the base64 encoded image or a public URL.
 */
export async function generateSlideInfographic(
  visualDescription: string,
): Promise<string> {
  const project = env.GOOGLE_CLOUD_PROJECT;
  const location = env.GOOGLE_CLOUD_LOCATION;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${GEMINI_IMAGE_MODEL}:predict`;

  const stylePrefix =
    "modern SaaS dashboard infographic, flat design, minimal, clean UI, vector style, white background, subtle purple and blue accents, startup analytics aesthetic. ";
  const prompt = stylePrefix + visualDescription;

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
    throw new Error(`Failed to generate infographic: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    predictions?: Array<{
      bytesBase64?: string;
      bytesBase64Encoded?: string;
    }>;
  };

  const base64Image =
    data.predictions?.[0]?.bytesBase64Encoded ||
    data.predictions?.[0]?.bytesBase64;

  if (!base64Image) {
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

/**
 * Generate a personalized coach debrief (4 slides) using Vertex AI.
 */
export async function generateCoachDebrief(
  transcript: string,
  personaName: string,
  personaRole: string,
): Promise<any[]> {
  const model = vertexAI.getGenerativeModel({
    model: EVALUATION_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
    } as GenerationConfig,
  });

  const prompt = `You are a world-class sales coach creating a short "Coach Debrief" presentation for a sales rep after a practice call.

Persona Context:
- Buyer Name: ${personaName}
- Buyer Role: ${personaRole}

Transcript:
${transcript}

Your job is to produce a concise, insightful 4-slide coaching presentation.

Each slide will be turned into:
- narrated audio (TTS)
- an AI-generated infographic image

Therefore, the visual descriptions MUST describe clean infographic-style diagrams suitable for a modern SaaS analytics dashboard.

IMPORTANT VISUAL STYLE RULES:
All visuals must follow this design language:
- SaaS dashboard infographic
- flat design
- minimal
- clean UI
- vector style
- white background
- subtle purple and blue accents
- modern startup analytics aesthetic

Avoid artistic illustrations, cartoons, or paintings. Prefer charts, diagrams, timelines, comparison cards, and dashboards.

Generate EXACTLY 4 slides using this strict JSON structure:

{
  "title": "Concise headline for the slide",
  "narration": "A spoken coaching script. Keep it under 20 seconds when spoken (40–50 words max). Clear, confident, and supportive.",
  "visual": "A detailed description of an infographic or analytics-style diagram that illustrates the coaching insight.",
  "type": "overview" | "problem" | "correction" | "drill"
}

Slide Requirements:

Slide 1 (type: overview)
Provide a high-level summary of the call.
The visual should be a coaching analytics dashboard or conversation performance heatmap showing stages like:
Introduction, Discovery, Pitch, Objection Handling, Closing.

Slide 2 (type: problem)
Identify the SINGLE biggest mistake or friction point in the conversation.
Quote or reference the rep's words if possible.
The visual should highlight the problematic moment, such as:
- a conversation timeline with a red drop in engagement
- a highlighted objection moment
- a comparison chart showing strong vs weak moments.

Slide 3 (type: correction)
Explain how to fix the problem.
Include a clear "Before vs After" example of what the rep should say.
The visual should be a side-by-side comparison infographic showing:
"Original Response" vs "Improved Response".

Slide 4 (type: drill)
Give the rep one actionable practice drill they can do before their next call.
The drill should be specific and practical.
The visual should be a simple practice framework diagram or step-by-step coaching card showing how to rehearse the skill.

Return ONLY a valid JSON array of 4 slide objects.
Do not include explanations or extra text.`;

  const response = await model.generateContent(prompt);
  const text = response.response.candidates?.[0].content.parts?.[0].text ?? "";
  const jsonStr = extractJson(text);

  if (!jsonStr) {
    throw new Error(
      "Failed to generate debrief. Invalid JSON response from AI.",
    );
  }

  return JSON.parse(jsonStr);
}
