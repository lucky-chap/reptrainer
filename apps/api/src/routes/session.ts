import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireApiSecret } from "../middleware/auth.js";
import { evaluateSession } from "../services/vertex.js";
import { generateFeedbackReport } from "../services/feedback.js";
import { generateCoachDebrief } from "../services/vertex.js";
import { synthesizeSpeech } from "../services/tts.js";

export const sessionRoutes: Router = Router();

const evaluateSessionSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  intensityLevel: z.number().int().min(1).max(3),
  durationSeconds: z.number().min(0),
  trackId: z.string().optional(),
  scenarioId: z.string().optional(),
});

const feedbackSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  intensityLevel: z.number().int().min(1).max(3),
  durationSeconds: z.number().min(0),
  trackId: z.string().optional(),
  scenarioId: z.string().optional(),
});

const debriefSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  durationSeconds: z.number().min(180), // Duration guard
});

/**
 * POST /api/session/debrief
 * Generates a 4-slide personalized AI coaching debrief with voiceover.
 */
sessionRoutes.post(
  "/debrief",
  requireApiSecret,
  validateBody(debriefSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transcript, personaName, personaRole } = req.body;

      console.log(
        `[debrief] Generating coach debrief for session with ${personaName} (${personaRole})`,
      );

      // 1. Generate 4 slides JSON
      let slides;
      try {
        slides = await generateCoachDebrief(
          transcript,
          personaName,
          personaRole,
        );
        console.log(
          `[debrief] Successfully generated ${slides.length} slides for ${personaName}`,
        );
      } catch (geminiError: any) {
        console.error(`[debrief] Gemini slide generation failed:`, geminiError);
        throw new Error(`AI generation failed: ${geminiError.message}`);
      }

      // 2. Synthesize audio for each slide narration
      console.log(
        `[debrief] Synthesizing audio for ${slides.length} slides...`,
      );
      const audioPromises = slides.map(async (slide: any, index: number) => {
        try {
          const base64 = await synthesizeSpeech(slide.narration);
          console.log(
            `[debrief] TTS successful for slide ${index + 1}: ${slide.title}`,
          );
          return base64;
        } catch (error) {
          console.error(
            `[debrief] TTS failed for slide ${index + 1} ("${slide.title}"):`,
            error,
          );
          return ""; // Return empty string for fallback if TTS fails per slide
        }
      });

      const audioBase64 = await Promise.all(audioPromises);
      console.log(
        `[debrief] Finished audio synthesis. Returning ${audioBase64.filter((a) => !!a).length}/${slides.length} audio tracks.`,
      );

      res.json({
        slides,
        audioBase64,
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
