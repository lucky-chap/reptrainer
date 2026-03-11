import { GoogleGenAI, type LiveConnectConfig } from "@google/genai";
import { FEMALE_VOICES, MALE_VOICES } from "@reptrainer/shared";
import { env } from "../config/env.js";
import {
  type GeneratePersonaRequest,
  type GeneratePersonaResponse,
  type EvaluateSessionRequest,
  type EvaluateSessionResponse,
  GEMINI_TEXT_MODEL,
  GEMINI_EVALUATION_MODEL,
  GEMINI_LIVE_MODEL,
  GEMINI_IMAGE_MODEL,
  PROSPECT_PERSONALITY_TEMPLATES,
  type ProspectPersonalityTemplate,
  type CompetitorContext,
} from "@reptrainer/shared";
import { uploadAvatar } from "./storage.js";
import { getKnowledgeMetadata } from "./knowledge.js";
import { ragService } from "./rag.js";

// Initialize Vertex AI using GoogleGenAI SDK
const genAI = new GoogleGenAI({
  vertexai: true,
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
});

const TEXT_MODEL = GEMINI_TEXT_MODEL; // Stable Vertex model
const EVALUATION_MODEL = GEMINI_EVALUATION_MODEL; // Stable Vertex model

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
          googleSearch: {
            searchTypes: {
              webSearch: {},
              imageSearch: {},
            },
          },
        },
      ],
    },
  });

  console.log("🔍 --- GOOGLE SEARCH GROUNDING DATA --- 🔍");
  try {
    const candidates = (response as any).candidates;
    if (candidates && candidates.length > 0) {
      console.log(JSON.stringify(candidates[0].groundingMetadata, null, 2));
    } else {
      console.log(
        "No candidates returned. Raw response:",
        JSON.stringify(response, null, 2),
      );
    }
  } catch (e) {
    console.error("Error logging search data:", e);
  }
  console.log("-----------------------------------------");

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

export async function generatePersona(
  input: GeneratePersonaRequest,
): Promise<GeneratePersonaResponse> {
  const {
    teamId,
    personalityType,
    gender: preferredGender,
    country,
    companyName: providedCompanyName,
  } = input;

  const metadata = await getKnowledgeMetadata(teamId);
  if (!metadata) {
    throw new Error(
      "Knowledge metadata not found. Please upload learning materials first.",
    );
  }

  const {
    productCategory,
    icp: targetCustomer,
    buyerRoles,
    competitors,
    valueProps,
    objections,
  } = metadata;

  // Retrieve granular context from RAG
  const ragContext = await ragService.retrieve(
    teamId,
    `product features, value proposition, target audience, common objections for ${productCategory}`,
    10,
  );

  const ragContextString =
    ragContext.length > 0
      ? `\n─── ADDITIONAL PRODUCT KNOWLEDGE (RAG) ───\n${ragContext.join("\n\n")}\n`
      : "";

  const companyName = providedCompanyName || "the company";
  const description = valueProps.join(". ");
  const industry = productCategory;

  let competitorContext: CompetitorContext | undefined;
  if (metadata.competitorContexts && metadata.competitorContexts.length > 0) {
    // Randomly select one competitor to ground the persona
    competitorContext =
      metadata.competitorContexts[
        Math.floor(Math.random() * metadata.competitorContexts.length)
      ];
  }

  // Handle gender randomization if "other" is chosen
  const finalGender =
    preferredGender === "other"
      ? Math.random() > 0.5
        ? "male"
        : "female"
      : preferredGender;

  const template = personalityType
    ? (PROSPECT_PERSONALITY_TEMPLATES.find(
        (t) => t.type === personalityType,
      ) as ProspectPersonalityTemplate)
    : null;

  const personalityContext = template
    ? `
─── PERSONALITY TEMPLATE: ${template.name} ───
- Behavioral Profile: ${template.behavioralProfile}
- Tone: ${template.tone}
- Patience: ${template.patience}
- Verbosity: ${template.verbosity}
- Objection Likelihood: ${template.objectionLikelihood}
- Preferred Selling Points: ${template.preferredSellingPoints.join(", ")}
- Emotional Triggers: ${template.emotionalTriggers.join(", ")}
`
    : "";

  const prompt = `You are a sales training AI. Generate a realistic, challenging buyer persona for a high-pressure sales roleplay session.

Context:
- Company being pitched: ${companyName}
- Product: ${description}
- Target Customer: ${targetCustomer}
- Industry: ${industry}
- Common Objections: ${objections.join(", ")}${personalityContext}
${ragContextString}
${
  competitorContext
    ? `
─── CURRENT SOLUTION INFORMATION (COMPETITOR) ───
This persona currently uses: ${competitorContext.website}
Competitor Product: ${competitorContext.productDescription}
Pricing/Positioning: ${competitorContext.pricingPositioning}
Pain Points with Current Solution: ${competitorContext.painPoints.join(", ")}
Complaints: ${competitorContext.complaints.join(", ")}

The persona should be a current user of this competitor and should naturally reference it during the pitch.
`
    : ""
}
${finalGender ? `- Preferred Gender: ${finalGender}` : ""}
${country ? `- Origin Country: ${country}` : ""}

SUPPORTED LANGUAGES & BCP-47 CODES (Gemini Live):
Afrikaans (af), Albanian (sq), Amharic (am), Arabic (ar), Armenian (hy), Assamese (as), Azerbaijani (az), Basque (eu), Belarusian (be), Bengali (bn), Bosnian (bs), Bulgarian (bg), Catalan (ca), Chinese (zh), Croatian (hr), Czech (cs), Danish (da), Dutch (nl), English (en), Estonian (et), Filipino (fil), Finnish (fi), French (fr), Galician (gl), Georgian (ka), German (de), Greek (el), Gujarati (gu), Hebrew (iw), Hindi (hi), Hungarian (hu), Icelandic (is), Indonesian (id), Italian (it), Japanese (ja), Kannada (kn), Kazakh (kk), Khmer (km), Korean (ko), Lao (lo), Latvian (lv), Lithuanian (lt), Macedonian (mk), Malay (ms), Malayalam (ml), Marathi (mr), Mongolian (mn), Nepali (ne), Norwegian (no), Odia (or), Polish (pl), Portuguese (pt), Punjabi (pa), Romanian (ro), Russian (ru), Serbian (sr), Slovak (sk), Slovenian (sl), Spanish (es), Swahili (sw), Swedish (sv), Tamil (ta), Telugu (te), Thai (th), Turkish (tr), Ukrainian (uk), Urdu (ur), Uzbek (uz), Vietnamese (vi), Zulu (zu).

Generate a buyer persona with the following JSON structure. Return ONLY valid JSON:
{
  "name": "A realistic, memorable full name${finalGender ? ` for a ${finalGender} executive` : ""}${country ? ` from ${country}` : ""}. Use culturally diverse names appropriate to the origin country.",
  "role": "A specific, realistic job title (e.g., 'SVP of Revenue Operations', 'Chief Data Officer', 'Director of IT Infrastructure'). Avoid generic titles like 'Manager'.",
  "gender": "${finalGender || '"male" or "female"'} (must match the name)",
  "languageCode": "The BCP-47 code for the primary language spoken in their country (must be one of the supported codes listed above).",
  "companyType": "A realistic description of their company (e.g., 'Fortune 500 Fintech', 'Seed-stage AI startup', 'Mid-market manufacturing giant')",
  "industry": "${industry || "General Industry"}",
  "seniorityLevel": "e.g., Senior Executive, C-suite, VP-level decision maker",
  "personalityTraits": ["3-4 specific personality traits"],
  "personalityType": "${personalityType || "custom"}",
  "motivations": ["2-3 core business motivations for this person"],
  "objections": ["3-5 specific objections this person would raise during a pitch"],
  "traits": {
    "aggressiveness": 1-10,
    "interruptionFrequency": "low, medium, or high",
    "objectionStyle": "analytical, emotional, authority-based, or budget-focused"
  },
  "speakingStyle": "Describe their verbal pattern (e.g., 'fast-paced and data-driven', 'slow, skeptical and deliberate'). Include how their native language/culture influences their style.",
  "accent": "Specify a natural regional accent based on their country: ${country || "Global"}",
  "voiceName": "Choose one from the context-appropriate list based on the gender: ${finalGender === "male" ? MALE_VOICES.join(", ") : finalGender === "female" ? FEMALE_VOICES.join(", ") : [...MALE_VOICES, ...FEMALE_VOICES].join(", ")}",
  "communicationStyle": "professional",
  "emotionalState": "e.g., Skeptical, Busy, Curiously optimistic, Guarded",
  "environmentContext": "Where they are (e.g., noisy open office, quiet executive suite, airport lounge)",
  "timePressure": "e.g., 'Hurry, has 5 mins', 'Calm, has 30 mins but hates fluff'",
  "conversationBehavior": ["2-3 specific conversational patterns/habits"],
  "buyingAttitude": "e.g., Skeptical but open if high value, Tech-first early adopter, Highly price-sensitive",
  "difficultyLevel": "medium",
  "intensityLevel": 1-5 (1=Friendly, 3=Tough, 5=Hostile),
  "patience": "medium",
  "verbosity": "medium",
  "physicalDescription": "A detailed 1-sentence description of this person's physical appearance, ensuring it is culturally and ethnically appropriate for someone from ${country || "their background"}. Include specific details like skin tone (e.g., 'dark chocolate skin', 'olive complexion', 'fair skin'), typical hair style or features common to that region to ensure the AI image generator produces an accurate representation. FOR EXAMPLE: A Nigerian persona MUST have dark skin.",
  "personalityPrompt": "A detailed system prompt (5-8 sentences) describing how this persona behaves in sales meetings. ${template ? `IT MUST INCORPORATE THE BEHAVIORAL PROFILE, TONE, AND TRIGGERS FROM THE ${template.name} TEMPLATE.` : "Include: communication style, skepticism triggers, pet peeves, and decision-making approach."}",
  "objectionStrategy": "A specific 2-3 sentence strategy this persona uses to push back. This MUST be dynamic and specific to the product context.",
  "competitorContext": ${competitorContext ? JSON.stringify(competitorContext, null, 2) : "null"}
}

IMPORTANT:
- ${finalGender ? `The name and gender MUST be ${finalGender}.` : "Vary the gender across generations — create a realistic mix of male and female personas."}
- The name MUST clearly match the gender field.
- "intensityLevel" MUST be an integer between 1 and 5 (1=Friendly, 3=Tough, 5=Hostile).
- "objectionStrategy" MUST be unique and reflect the persona's specific role and context.
- "traits" object MUST be fully populated with realistic values matching the personality.
- Make the name MEMORABLE and DISTINCT.
- Vary cultural backgrounds. ${country ? `Prioritize the specified country (${country}) for the name, background, and accent.` : "Do NOT default to generic Anglo-Saxon names every time."}
- "languageCode" MUST be a valid BCP-47 code from the provided list.`;

  const response = await genAI.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 1.2,
      responseMimeType: "application/json",
    },
  });
  const text = response.text || "";
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

  const prompt = `You are an expert sales performance evaluator and coach. Analyze the following sales roleplay transcript and provide a structured evaluation.

Persona Context:
- Buyer Name: ${personaName}
- Buyer Role: ${personaRole}
- Difficulty Level: ${intensityLevel}/5
- Call Duration: ${Math.round(durationSeconds / 60)} minutes

Transcript:
${transcript}

Evaluate the sales rep's performance on these 5 specific skills (Score 0-100):
1. **Discovery Questions**: Did the rep ask open-ended questions to uncover pain points, budget, and decision-making processes?
2. **Objection Handling**: Did the rep effectively acknowledge concerns and provide persuasive rebuttals to pushback?
3. **Product Positioning**: Did the rep align product features with the buyer's specifically mentioned needs and value drivers? 
4. **Closing**: Did the rep clearly define next steps or ask for the business at the appropriate time?
5. **Active Listening**: Did the rep demonstrate understanding by summarizing, mirroring, or reacting appropriately to the buyer's cues?

SCORING GUIDELINES:
- **Score honestly.** DO NOT inflate scores. If a rep performed poorly, the score should reflect that (e.g., 10-30).
- **Be balanced.** A truly perfect session is rare. 85+ is for world-class performance. 50-65 is average. Below 40 is poor.
- **Evidence-based.** Ensure the scores align with the specific strengths and weaknesses identified.

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

  const response = await genAI.models.generateContent({
    model: EVALUATION_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  });
  const text = response.text || "";
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
  voiceNameInput: string,
) {
  // Ensure voiceName is valid for the Live API
  const allVoices = [...FEMALE_VOICES, ...MALE_VOICES];
  const voiceName = allVoices.includes(voiceNameInput)
    ? voiceNameInput
    : "Kore";

  return {
    setup: {
      model: `projects/${project}/locations/${location}/publishers/google/models/${GEMINI_LIVE_MODEL}`,
      generation_config: {
        response_modalities: ["AUDIO"],
        // session_resumption_config: {
        //   transparent: true,
        // },
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
            text: `You are in a live multimodal conversational environment. Your output is audio-only. Be concise, direct, and maintain your persona naturally. Your responses should generally be 1-3 sentences unless asked for detail. You can interrupt the user if they are rambling or avoiding questions.

TURN-TAKING RULES (CRITICAL):
- After you speak 1-3 sentences, STOP and WAIT for the user to respond. Do NOT keep talking.
- This is a TWO-WAY conversation. You MUST give the user space to speak after each of your turns.
- Your opening introduction should be at most 2 sentences. Introduce yourself briefly, then STOP and wait.
- If you find yourself talking for more than 15 seconds without the user responding, STOP immediately and wait.

ANTI-REPETITION RULES (CRITICAL):
- NEVER repeat a sentence, phrase, or point you have already said. If you already made a point, move the conversation forward.
- After a tool call returns, CONTINUE from exactly where you left off. Do NOT re-say anything you already spoke before the tool call.
- If you feel stuck or unsure, ask a NEW question instead of re-stating a previous one.

TOOL USAGE RULES (CRITICAL):
- All tool calls are INVISIBLE background operations. They happen silently.
- NEVER say "let me check", "one moment", "hold on", or any phrase that narrates a tool call. Just call the tool and keep talking naturally.
- NEVER mention tool names, parameters, or results in your speech.
- Do NOT pause your speech to call a tool. Call it seamlessly mid-conversation.

When to call tools:
1. Use \`log_sales_insight\` FREQUENTLY — after almost every user response. Log coaching tips proactively: what they should say next, what they did well, what they missed, their tone, their pacing, filler words, missed opportunities, etc. Aim for at least one insight every 1-2 turns. Be a world-class sales coach whispering in their ear.
2. Use \`log_objection\` when you raise an objection or when the user responds to one.
3. Use \`update_persona_mood\` every 3-4 turns to reflect your internal emotional state.`,
          },
          { text: systemPrompt },
        ],
      },
      input_audio_transcription: {},
      output_audio_transcription: {},
      realtime_input_config: {
        automatic_activity_detection: {
          prefix_padding_ms: 100,
          silence_duration_ms: 500,
          start_of_speech_sensitivity: "START_SENSITIVITY_HIGH",
          end_of_speech_sensitivity: "END_SENSITIVITY_LOW",
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
                    description:
                      "The description of the sales insight. The description should be geared towards the user, in a form of advice. Use pronouns like 'you'. Directly address the user.",
                  },
                },
                required: ["insight"],
              },
            },
            {
              name: "log_objection",
              description:
                "Log a specific objection raised by the persona and how the user handled it.",
              parameters: {
                type: "object",
                properties: {
                  objectionType: {
                    type: "string",
                    description:
                      "The category of objection (e.g., 'Pricing', 'Integration', 'Timing', 'Competitor').",
                  },
                  repResponse: {
                    type: "string",
                    description: "A brief summary of how the rep handled it.",
                  },
                  sentiment: {
                    type: "string",
                    enum: ["positive", "neutral", "negative"],
                    description: "How well the objection was handled.",
                  },
                },
                required: ["objectionType", "repResponse", "sentiment"],
              },
            },
            {
              name: "update_persona_mood",
              description:
                "Update the internal emotional state of the persona.",
              parameters: {
                type: "object",
                properties: {
                  trust: {
                    type: "number",
                    description: "Trust level (0-100).",
                  },
                  interest: {
                    type: "number",
                    description: "Interest level (0-100).",
                  },
                  frustration: {
                    type: "number",
                    description: "Frustration level (0-100).",
                  },
                  dealLikelihood: {
                    type: "number",
                    description:
                      "Probability of closing the deal (0.0 to 1.0).",
                  },
                },
                required: [
                  "trust",
                  "interest",
                  "frustration",
                  "dealLikelihood",
                ],
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
        {
          googleSearch: {},
        },
      ],
    },
  };
}

/**
 * Generate an image using Imagen 3 via @google/genai SDK
 * Returns the image buffer.
 */
async function generateImage(prompt: string): Promise<Buffer> {
  const response = await genAI.models.generateImages({
    model: GEMINI_IMAGE_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "1:1",
    },
  });

  const imageData = response.generatedImages?.[0]?.image?.imageBytes;

  if (imageData) {
    return Buffer.from(imageData, "base64");
  }

  console.error(
    "Imagen API Response did not contain image data:",
    JSON.stringify(response, null, 2),
  );
  throw new Error("No image data returned from Imagen API via SDK");
}

/**
 * Generate a persona avatar image using Imagen 3 and store in Firebase.
 * Returns the permanent storage URL.
 */
export async function generatePersonaAvatar(
  gender: string,
  role: string,
  country?: string,
  physicalDescription?: string,
): Promise<string> {
  const countryContext = country ? ` from ${country}` : "";

  const appearanceContext = physicalDescription
    ? `, ${physicalDescription}`
    : country
      ? `, with culturally appropriate physical features and characteristics matching someone from ${country}`
      : "";

  const prompt = `A professional, photorealistic headshot portrait of a ${gender} executive in their early 40s${countryContext}${appearanceContext}. Job title: ${role}. High-end corporate photography, soft studio lighting, blurred office background, neutral professional attire. Highly detailed and realistic features.`;

  console.log(`Generating avatar for ${gender} ${role}...`);
  const imageBuffer = await generateImage(prompt);

  console.log("Uploading avatar to Firebase Storage...");
  const publicUrl = await uploadAvatar(imageBuffer);

  console.log("Avatar upload done...");

  return publicUrl;
}

/**
 * Generate a coaching infographic using Imagen 4.0 via SDK.
 * Returns the base64 encoded image string or a public URL.
 */
export async function generateSlideInfographic(
  visualDescription: string,
): Promise<string> {
  const stylePrefix =
    "modern SaaS dashboard infographic, flat design, minimal, clean UI, vector style, white background, subtle purple and blue accents, startup analytics aesthetic. ";
  const prompt = stylePrefix + visualDescription;

  const response = await genAI.models.generateImages({
    model: GEMINI_IMAGE_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      // @ts-ignore
      mimeType: "image/jpeg",
      compressionQuality: 80,
    },
  });

  const imageData = response.generatedImages?.[0]?.image?.imageBytes;

  if (imageData) {
    return `data:image/jpeg;base64,${imageData}`;
  }

  throw new Error("No image data returned from Imagen API via SDK");
}

/**
 * Generate a personalized coach debrief (4 slides) using Vertex AI.
 */
export async function generateCoachDebrief(
  transcript: string,
  personaName: string,
  personaRole: string,
  objections: any[] = [],
  moods: any[] = [],
): Promise<any[]> {
  const prompt = `You are a world-class sales coach creating a short "Coach Debrief" presentation for a sales rep after a practice call.

Persona Context:
- Buyer Name: ${personaName}
- Buyer Role: ${personaRole}

Transcript:
${transcript}

Session Data:
- Objections Logged: ${JSON.stringify(objections, null, 2)}
- Persona Mood Trends: ${JSON.stringify(moods, null, 2)}

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
Incorporate the "Mood Trends" into this visual description (e.g. "a line graph showing trust increasing during discovery but dipping during pricing").

Slide 2 (type: problem)
Identify the SINGLE biggest mistake or friction point in the conversation.
Quote or reference the rep's words if possible.
The visual should highlight the problematic moment, such as:
- a conversation timeline with a red drop in engagement (reference specific mood data if trust/interest dropped)
- a highlighted objection moment (reference one of the logged objections)
- a comparison chart showing strong vs weak moments.

Slide 3 (type: correction)
Explain how to fix the problem.
Include a clear "Before vs After" example of what the rep should say.
The visual should be a side-by-side comparison infographic showing:
"Original Response" vs "Improved Response".

Slide 4 (type: drill)
Give the rep one actionable practice drill they can do before their next call.
The drill should be specific and practical.
The visual should be a practice framework diagram or step-by-step coaching card showing how to rehearse the skill.

Return ONLY a valid JSON array of 4 slide objects.
Do not include explanations or extra text.`;

  const response = await genAI.models.generateContent({
    model: EVALUATION_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  });
  const text = response.text || "";
  const jsonStr = extractJson(text);

  if (!jsonStr) {
    throw new Error(
      "Failed to generate debrief. Invalid JSON response from AI.",
    );
  }

  return JSON.parse(jsonStr);
}
