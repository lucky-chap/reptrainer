import { GoogleGenAI } from "@google/genai";
import {
  type CompetitorContext,
  type EvaluateSessionRequest,
  type EvaluateSessionResponse,
  FEMALE_VOICES,
  GEMINI_EVALUATION_MODEL,
  GEMINI_MULTIMODAL_MODEL,
  GEMINI_TEXT_MODEL,
  type GeneratePersonaRequest,
  type GeneratePersonaResponse,
  MALE_VOICES,
  PROSPECT_PERSONALITY_TEMPLATES,
  type ProspectPersonalityTemplate,
} from "@reptrainer/shared";
import { env } from "../config/env.js";
import { getKnowledgeMetadata } from "./knowledge.js";
import { ragService } from "./rag.js";
import { uploadAvatar } from "./storage.js";

// Initialize Vertex AI or Gemini API using GoogleGenAI SDK
export const genAI =
  env.GOOGLE_GENAI_USE_VERTEXAI === "TRUE"
    ? new GoogleGenAI({
        vertexai: true,
        project: env.GOOGLE_CLOUD_PROJECT,
        location: env.GOOGLE_CLOUD_LOCATION,
      })
    : new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export const TEXT_MODEL = GEMINI_TEXT_MODEL; // Stable Vertex model
export const EVALUATION_MODEL = GEMINI_EVALUATION_MODEL; // Stable Vertex model

/**
 * Extracts JSON from a potentially markdown-wrapped AI response.
 */
export function extractJson(text: string): string | null {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Researches a competitor based on their name or website URL using Google Search grounding.
 */
export async function researchCompetitor(
  competitorName: string,
): Promise<CompetitorContext> {
  const prompt = `Research the competitor: ${competitorName}
  Identify their:
  1. Official website URL.
  2. Product description and core value proposition.
  3. Target customer segments.
  4. Pricing positioning (enterprise, budget, mid-market).
  5. Common customer pain points or limitations.
  6. Frequent customer complaints from review sites.

  Generate a competitor analysis with the following JSON structure. Return ONLY valid JSON:
  {
    "name": "${competitorName}",
    "website": "...",
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
      `Failed to research competitor "${competitorName}". Invalid research data.`,
    );
  }

  return JSON.parse(jsonStr) as CompetitorContext;
}

/**
 * Builds all the shared context needed for persona generation prompts:
 * metadata, RAG, competitor selection, gender, personality template.
 */
async function buildPersonaPromptContext(input: GeneratePersonaRequest) {
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

  const basePrompt = `You are a sales training AI. Generate a realistic, challenging buyer persona for a high-pressure sales roleplay session.

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
Afrikaans (af), Albanian (sq), Amharic (am), Arabic (ar), Armenian (hy), Assamese (as), Azerbaijani (az), Basque (eu), Belarusian (be), Bengali (bn), Bosnian (bs), Bulgarian (bg), Catalan (ca), Chinese (zh), Croatian (hr), Czech (cs), Danish (da), Dutch (nl), English (en), Estonian (et), Filipino (fil), Finnish (fi), French (fr), Galician (gl), Georgian (ka), German (de), Greek (el), Gujarati (gu), Hebrew (iw), Hindi (hi), Hungarian (hu), Icelandic (is), Indonesian (id), Italian (it), Japanese (ja), Kannada (kn), Kazakh (kk), Khmer (km), Korean (ko), Lao (lo), Latvian (lv), Lithuanian (lt), Macedonian (mk), Malay (ms), Malayalam (ml), Marathi (mr), Mongolian (mn), Nepali (ne), Norwegian (no), Odia (or), Polish (pl), Portuguese (pt), Punjabi (pa), Romanian (ro), Russian (ru), Serbian (sr), Slovak (sk), Slovenian (sl), Spanish (es), Swahili (sw), Swedish (sv), Tamil (ta), Telugu (te), Thai (th), Turkish (tr), Ukrainian (uk), Urdu (ur), Uzbek (uz), Vietnamese (vi), Zulu (zu).`;

  const jsonSchema = `{
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
}`;

  const validationRules = `IMPORTANT:
- ${finalGender ? `The name and gender MUST be ${finalGender}.` : "Vary the gender across generations — create a realistic mix of male and female personas."}
- The name MUST clearly match the gender field.
- "intensityLevel" MUST be an integer between 1 and 5 (1=Friendly, 3=Tough, 5=Hostile).
- "objectionStrategy" MUST be unique and reflect the persona's specific role and context.
- "traits" object MUST be fully populated with realistic values matching the personality.
- Make the name MEMORABLE and DISTINCT.
- Vary cultural backgrounds. ${country ? `Prioritize the specified country (${country}) for the name, background, and accent.` : "Do NOT default to generic Anglo-Saxon names every time."}
- "languageCode" MUST be a valid BCP-47 code from the provided list.`;

  return {
    basePrompt,
    jsonSchema,
    validationRules,
    finalGender,
    country,
    competitorContext,
  };
}

/**
 * Generate a persona with text + avatar image in a single multimodal Gemini call.
 * Falls back gracefully if no image is returned (avatarUrl will be undefined).
 */
export async function generateMultimodalPersona(
  input: GeneratePersonaRequest,
): Promise<GeneratePersonaResponse & { avatarUrl?: string }> {
  const { basePrompt, jsonSchema, validationRules, finalGender, country } =
    await buildPersonaPromptContext(input);

  const countryContext = country ? ` from ${country}` : "";
  const prompt = `${basePrompt}

Generate a buyer persona with the following JSON structure. Wrap the JSON in a \`\`\`json code fence:
\`\`\`json
${jsonSchema}
\`\`\`

${validationRules}

After outputting the JSON block, generate a professional, photorealistic headshot portrait of this persona based on the "physicalDescription" field you generated. The image must be: a ${finalGender || "person"} executive in their early 40s${countryContext}, with culturally appropriate features. High-end corporate photography, soft studio lighting, blurred office background, neutral professional attire. Highly detailed and realistic.`;

  console.log(
    `[multimodal-persona] Generating unified text+image persona`,
  );

  const response = await genAI.models.generateContent({
    model: GEMINI_MULTIMODAL_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      // @ts-ignore - responseModalities is valid for multimodal output models
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 1.2,
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  let personaData: GeneratePersonaResponse | null = null;
  let avatarUrl: string | undefined;

  for (const part of parts) {
    if (part.text) {
      const jsonMatch = part.text.match(/```json\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : extractJson(part.text);
      if (jsonStr) {
        try {
          personaData = JSON.parse(jsonStr) as GeneratePersonaResponse;
        } catch {
          console.warn(
            "[multimodal-persona] Failed to parse persona JSON:",
            jsonStr.substring(0, 100),
          );
        }
      }
    } else if (part.inlineData) {
      // Avatar image — upload to Firebase Storage
      try {
        let base64Data = part.inlineData.data || "";
        if (base64Data.startsWith("data:")) {
          base64Data = base64Data.split(",")[1];
        }
        const buffer = Buffer.from(base64Data, "base64");
        avatarUrl = await uploadAvatar(buffer);
        console.log("[multimodal-persona] Avatar uploaded successfully");
      } catch (uploadError) {
        console.error(
          "[multimodal-persona] Avatar upload failed:",
          uploadError,
        );
      }
    }
  }

  if (!personaData) {
    throw Object.assign(
      new Error(
        "Failed to generate multimodal persona. No valid JSON in response.",
      ),
      { statusCode: 502 },
    );
  }

  console.log(
    `[multimodal-persona] Generated persona: ${personaData.name} (avatar: ${avatarUrl ? "yes" : "no"})`,
  );

  return { ...personaData, avatarUrl };
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
    teamId,
  } = input;

  // Retrieve RAG context if teamId is provided
  let ragContextString = "";
  if (teamId) {
    try {
      const ragContext = await ragService.retrieve(
        teamId,
        `product category, product features, intended value, and core benefits related to: ${transcript.substring(0, 1000)}`,
        5,
      );
      if (ragContext.length > 0) {
        ragContextString = `\n\n─── PRODUCT KNOWLEDGE (RAG) ───\nThe following confirmed product details should be used to evaluate the rep's positioning accuracy:\n${ragContext.join("\n\n")}`;
      }
    } catch (error) {
      console.error("[evaluateSession] RAG retrieval failed:", error);
    }
  }

  const prompt = `You are an expert sales performance evaluator and coach. Analyze the following sales roleplay transcript and provide a structured evaluation.

Persona Context:
- Buyer Name: ${personaName}
- Buyer Role: ${personaRole}
- Difficulty Level: ${intensityLevel}/5
- Call Duration: ${Math.round(durationSeconds / 60)} minutes${ragContextString}

Transcript:
${transcript}

Evaluate the sales rep's performance on these 5 specific skills (Score 0-100):
1. **Discovery Questions**: Did the rep ask open-ended questions to uncover pain points, budget, and decision-making processes?
2. **Objection Handling**: Did the rep effectively acknowledge concerns and provide persuasive rebuttals to pushback?
3. **Product Positioning**: Did the rep align product features with the buyer's specifically mentioned needs and value drivers? If RAG data is provided, evaluate if they accurately represented the product.
4. **Closing**: Did the rep clearly define next steps or ask for the business at the appropriate time?
5. **Active Listening**: Did the rep demonstrate understanding by summarizing, mirroring, or reacting appropriately to the buyer's cues?

SCORING GUIDELINES:
- **Score honestly.** DO NOT inflate scores. If a rep performed poorly, the score should reflect that (e.g., 10-30).
- **Be balanced.** A truly perfect session is rare. 85+ is for world-class performance. 50-65 is average. Below 40 is poor.
- **Evidence-based.** Ensure the scores align with the specific strengths and weaknesses identified.
- **Product Accuracy factor:** If the rep contradicts the provided RAG data, they should receive a lower score on Product Positioning.

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
 * Build a combined RAG + knowledge metadata context string for debrief prompts.
 * Retrieves both raw document snippets and structured metadata (value props,
 * differentiators, objections, competitors) to ground the coaching across all slides.
 */
async function buildDebriefKnowledgeContext(
  teamId: string,
  transcript: string,
): Promise<string> {
  let sections: string[] = [];

  // 1. Structured knowledge metadata
  try {
    const metadata = await getKnowledgeMetadata(teamId);
    if (metadata) {
      const parts: string[] = [];
      if (metadata.productCategory)
        parts.push(`Product Category: ${metadata.productCategory}`);
      if (metadata.valueProps?.length)
        parts.push(
          `Value Propositions:\n- ${metadata.valueProps.join("\n- ")}`,
        );
      if (metadata.differentiators?.length)
        parts.push(
          `Key Differentiators:\n- ${metadata.differentiators.join("\n- ")}`,
        );
      if (metadata.objections?.length)
        parts.push(`Common Objections:\n- ${metadata.objections.join("\n- ")}`);
      if (metadata.competitors?.length)
        parts.push(`Competitors: ${metadata.competitors.join(", ")}`);
      if (metadata.competitorContexts?.length) {
        const compSummaries = metadata.competitorContexts
          .map(
            (c: any) =>
              `  • ${c.name}: ${c.productDescription || ""}${c.painPoints?.length ? ` | Pain points: ${c.painPoints.join(", ")}` : ""}`,
          )
          .join("\n");
        parts.push(`Competitor Intelligence:\n${compSummaries}`);
      }
      if (parts.length > 0) {
        sections.push(
          `─── PRODUCT & MARKET KNOWLEDGE ───\n${parts.join("\n\n")}`,
        );
      }
    }
  } catch (error) {
    console.error(
      "[buildDebriefKnowledgeContext] Metadata fetch failed:",
      error,
    );
  }

  // 2. RAG document snippets
  try {
    const ragContext = await ragService.retrieve(
      teamId,
      `key product differences, specific features, and ideal improved pitches related to: ${transcript.substring(0, 1000)}`,
      5,
    );
    if (ragContext.length > 0) {
      sections.push(
        `─── PRODUCT KNOWLEDGE (RAG) ───\n${ragContext.join("\n\n")}`,
      );
    }
  } catch (error) {
    console.error(
      "[buildDebriefKnowledgeContext] RAG retrieval failed:",
      error,
    );
  }

  return sections.length > 0 ? `\n\n${sections.join("\n\n")}` : "";
}

/**
 * Unified multimodal debrief: generates coaching text + inline infographic images
 * in a single Gemini call using native interleaved text/image output.
 *
 * Returns slides in the same shape as the legacy pipeline (DebriefSlide[]),
 * but with visualBase64 already populated from inline image generation.
 */
export async function generateMultimodalDebrief(
  transcript: string,
  personaName: string,
  personaRole: string,
  objections: any[] = [],
  moods: any[] = [],
  teamId?: string,
): Promise<any[]> {
  // Retrieve RAG context + knowledge metadata if teamId is provided
  let knowledgeContext = "";
  if (teamId) {
    knowledgeContext = await buildDebriefKnowledgeContext(teamId, transcript);
  }

  const prompt = `You are a world-class sales coach creating a 4-slide "Coach Debrief" for a sales rep after a practice call.

For EACH slide you must output:
1. A JSON block (wrapped in \`\`\`json ... \`\`\`) containing: title, narration, type, and visual (description).
2. Immediately after the JSON block, generate an infographic IMAGE that visualizes the coaching insight.

Persona Context:
- Buyer Name: ${personaName}
- Buyer Role: ${personaRole}

Transcript:
${transcript}

Session Data:
- Objections Logged: ${JSON.stringify(objections, null, 2)}
- Persona Mood Trends: ${JSON.stringify(moods, null, 2)}${knowledgeContext}
${knowledgeContext ? `\n**IMPORTANT**: Product & market knowledge has been provided above. Use it across ALL slides to ground your coaching in the team's actual product, value propositions, differentiators, and competitive landscape. Do not invent product features — use only what is documented.\n` : ""}
─── SLIDE FORMAT ───

For each slide, output a JSON block then generate an image. Repeat 4 times.

Slide JSON structure:
\`\`\`json
{
  "title": "Concise headline",
  "narration": "Spoken coaching script, under 50 words. Clear, confident, supportive.",
  "type": "overview|problem|correction|drill",
  "visual": "Description of what the infographic shows",
  "previousApproach": "Optional: For 'correction' slides, the original weak script.",
  "betterApproach": "Optional: For 'correction' slides, the recommended improved script."
}
\`\`\`
Then generate an image: a clean, modern SaaS dashboard infographic with flat design, minimal UI, white background, subtle purple and blue accents. No cartoons or artistic illustrations — use charts, diagrams, timelines, comparison cards, and dashboards.

─── SLIDE REQUIREMENTS ───

Slide 1 (type: overview): High-level call summary. ${knowledgeContext ? "Evaluate whether the rep correctly positioned the product's key value propositions and differentiators." : ""} Image: coaching analytics dashboard or performance heatmap showing Introduction, Discovery, Pitch, Objection Handling, Closing stages. Incorporate mood trend data.

Slide 2 (type: problem): The SINGLE biggest mistake. Quote the rep if possible. ${knowledgeContext ? "Check if the mistake involved misquoting product capabilities, missing a key differentiator, or failing to address a known objection." : ""} Image: conversation timeline with a red drop at the friction point, or a highlighted objection moment.

Slide 3 (type: correction): How to fix it with a "Before vs After" example. ${knowledgeContext ? 'The "betterApproach" MUST use correct product terminology, value props, and differentiators from the knowledge base.' : ""} Image: side-by-side comparison — "Original Response" vs "Improved Response".

Slide 4 (type: drill): One actionable practice drill. ${knowledgeContext ? "Tailor the drill to the team's specific product language, common objections, and competitive positioning." : ""} Image: step-by-step coaching card or practice framework diagram.

Output exactly 4 slides. Each slide = one JSON block + one generated image.`;

  console.log(
    `[multimodal-debrief] Generating unified text+image debrief for ${personaName} (${personaRole})`,
  );

  const response = await genAI.models.generateContent({
    model: GEMINI_MULTIMODAL_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      // @ts-ignore - responseModalities is valid for multimodal output models
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  // Parse interleaved text + image parts from the response
  const parts = response.candidates?.[0]?.content?.parts || [];
  const slides: any[] = [];
  let currentSlide: any = null;

  for (const part of parts) {
    if (part.text) {
      // Extract JSON from text parts
      const jsonMatch = part.text.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1].trim();
        try {
          currentSlide = JSON.parse(jsonStr);
        } catch {
          console.warn(
            "[multimodal-debrief] Failed to parse slide JSON:",
            jsonStr.substring(0, 100),
          );
        }
      } else {
        // Try direct JSON extraction as fallback
        const directJson = extractJson(part.text);
        if (directJson) {
          try {
            const parsed = JSON.parse(directJson);
            if (parsed.title && parsed.narration) {
              currentSlide = parsed;
            }
          } catch {
            // Not valid JSON, skip
          }
        }
      }
    } else if (part.inlineData) {
      // Image part — attach to the current slide
      if (currentSlide) {
        currentSlide.visualBase64 = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        slides.push(currentSlide);
        currentSlide = null;
      } else {
        console.warn(
          "[multimodal-debrief] Received image without preceding slide JSON, skipping",
        );
      }
    }
  }

  // Handle any trailing slide that didn't get an image
  if (currentSlide) {
    slides.push(currentSlide);
    currentSlide = null;
  }

  console.log(
    `[multimodal-debrief] Parsed ${slides.length} slides (${slides.filter((s) => s.visualBase64).length} with inline images)`,
  );

  if (slides.length === 0) {
    throw new Error(
      "Failed to generate multimodal debrief. No slides could be parsed from response.",
    );
  }

  return slides;
}
