import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireApiSecret } from "../middleware/auth.js";
import {
  evaluateSession,
  generateCoachDebrief,
  generateSlideInfographic,
} from "../services/vertex.js";
import { generateFeedbackReport } from "../services/feedback.js";
import { synthesizeSpeech } from "../services/tts.js";
import { uploadFile } from "../services/storage.js";
import { v4 as uuidv4 } from "uuid";

export const sessionRoutes: Router = Router();

const evaluateSessionSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  intensityLevel: z.number().int().min(1).max(5),
  durationSeconds: z.number().min(0),
  trackId: z.string().optional(),
  scenarioId: z.string().optional(),
});

const feedbackSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  intensityLevel: z.number().int().min(1).max(5),
  durationSeconds: z.number().min(0),
  trackId: z.string().optional(),
  scenarioId: z.string().optional(),
});

const debriefSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  durationSeconds: z.number().min(0),
  objections: z.array(z.any()).optional(),
  moods: z.array(z.any()).optional(),
});

/**
 * POST /api/session/debrief
 * Generates a 4-slide personalized AI coaching debrief with voiceover and infographics.
 */
sessionRoutes.post(
  "/debrief",
  requireApiSecret,
  validateBody(debriefSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transcript, personaName, personaRole } = req.body;
      const sessionId = uuidv4(); // Unique ID for storing assets

      console.log(
        `[debrief] Generating multimodal coach debrief for session ${sessionId} with ${personaName} (${personaRole})`,
      );

      // 1. Generate 4 slides JSON via Gemini
      let slides;
      try {
        slides = await generateCoachDebrief(
          transcript,
          personaName,
          personaRole,
          req.body.objections,
          req.body.moods,
        );
        console.log(
          `[debrief] Successfully generated ${slides.length} slides for ${personaName}`,
        );
      } catch (geminiError: any) {
        console.error(`[debrief] Gemini slide generation failed:`, geminiError);
        throw new Error(`AI generation failed: ${geminiError.message}`);
      }

      // 2. Synthesize audio AND generate infographics for each slide
      console.log(
        `[debrief] Processing multimodal assets for ${slides.length} slides...`,
      );

      const audioUrls: string[] = [];
      const visualUrls: string[] = [];

      // Process slides sequentially to avoid potential rate limits and manage Storage uploads
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slideIndex = i + 1;

        // A. Process Audio (TTS)
        try {
          const audioBase64 = await synthesizeSpeech(slide.narration);
          if (audioBase64) {
            const buffer = Buffer.from(audioBase64, "base64");
            const destination = `debriefs/${sessionId}/audio-slide-${slideIndex}.mp3`;
            const url = await uploadFile(buffer, destination, "audio/mpeg");
            audioUrls.push(url);
          } else {
            audioUrls.push("");
          }
        } catch (error) {
          console.error(
            `[debrief] Audio upload failed for slide ${slideIndex}:`,
            error,
          );
          audioUrls.push("");
        }

        // B. Process Visual (Imagen)
        try {
          let visualBase64 = await generateSlideInfographic(slide.visual);
          if (visualBase64) {
            // Strip data:image prefix if present
            if (visualBase64.startsWith("data:")) {
              visualBase64 = visualBase64.split(",")[1];
            }

            const buffer = Buffer.from(visualBase64, "base64");
            const destination = `debriefs/${sessionId}/visual-slide-${slideIndex}.jpg`;
            const url = await uploadFile(buffer, destination, "image/jpeg");
            visualUrls.push(url);
            slide.visualUrl = url; // Set the URL in the slide object
          } else {
            visualUrls.push("");
          }
        } catch (error) {
          console.error(
            `[debrief] Visual upload failed for slide ${slideIndex}:`,
            error,
          );
          visualUrls.push("");
        }

        // Clean up base64 from slide object if it exists (it shouldn't yet, but for safety)
        delete (slide as any).visualBase64;
        delete (slide as any).audioBase64;
      }

      console.log(
        `[debrief] Multimodal generation and upload complete. Audio: ${audioUrls.filter((a) => !!a).length}/${slides.length}, Visuals: ${visualUrls.filter((v) => !!v).length}/${slides.length}`,
      );

      res.json({
        slides,
        audioUrls,
        visualUrls,
      });
    } catch (error: any) {
      console.error("[debrief] Fatal error in debrief route:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  },
);

/**
 * POST /api/session/evaluate
 * Legacy evaluation endpoint — returns the simple 3-score format.
 */
sessionRoutes.post(
  "/evaluate",
  requireApiSecret,
  validateBody(evaluateSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evaluation = await evaluateSession(req.body);
      res.json(evaluation);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/session/feedback
 * Enhanced feedback report — returns the detailed structured feedback
 * with overall_score, strengths, weaknesses, missed_opportunities, etc.
 */
sessionRoutes.post(
  "/feedback",
  requireApiSecret,
  validateBody(feedbackSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(
        `[feedback] Generating feedback report for ${req.body.personaName} session (${Math.round(req.body.durationSeconds / 60)}min)`,
      );
      const report = await generateFeedbackReport(req.body);
      res.json(report);
    } catch (error) {
      console.error("[feedback] Error generating feedback report:", error);
      next(error);
    }
  },
);
