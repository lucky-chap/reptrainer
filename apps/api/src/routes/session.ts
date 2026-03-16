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
  generateMultimodalDebrief,
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
  teamId: z.string().optional(),
});

const feedbackSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  intensityLevel: z.number().int().min(1).max(5),
  durationSeconds: z.number().min(0),
  trackId: z.string().optional(),
  scenarioId: z.string().optional(),
  teamId: z.string().optional(),
});

const debriefSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  durationSeconds: z.number().min(0),
  objections: z.array(z.any()).optional(),
  moods: z.array(z.any()).optional(),
  teamId: z.string().optional(),
});

/**
 * POST /api/session/debrief
 * Generates a 4-slide personalized AI coaching debrief with voiceover and infographics.
 *
 * Streams progress events via SSE so the frontend can show real-time stage updates.
 * Uses Gemini's native multimodal output (text + image in a single call) for coherent,
 * low-latency debrief generation. Falls back to the legacy 3-service pipeline
 * (Gemini text → Imagen 3 images → Cloud TTS audio) if multimodal generation fails.
 */
sessionRoutes.post(
  "/debrief",
  requireApiSecret,
  validateBody(debriefSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    // Set up SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendProgress = (stage: string, detail?: string) => {
      res.write(
        `event: progress\ndata: ${JSON.stringify({ stage, detail })}\n\n`,
      );
    };

    try {
      const { transcript, personaName, personaRole } = req.body;
      const sessionId = uuidv4();

      console.log(
        `[debrief] Generating coach debrief for session ${sessionId} with ${personaName} (${personaRole})`,
      );

      // ── Step 1: Generate slides (unified multimodal → fallback to legacy) ──
      let slides: any[];
      let usedMultimodal = false;

      sendProgress("analyzing");

      try {
        slides = await generateMultimodalDebrief(
          transcript,
          personaName,
          personaRole,
          req.body.objections,
          req.body.moods,
          req.body.teamId,
        );
        usedMultimodal = true;
        console.log(
          `[debrief] Multimodal generation succeeded: ${slides.length} slides`,
        );
      } catch (multimodalError: any) {
        console.warn(
          `[debrief] Multimodal generation failed, falling back to legacy pipeline:`,
          multimodalError.message,
        );
        slides = await generateCoachDebrief(
          transcript,
          personaName,
          personaRole,
          req.body.objections,
          req.body.moods,
          req.body.teamId,
        );
        console.log(
          `[debrief] Legacy generation succeeded: ${slides.length} slides`,
        );
      }

      sendProgress("generating_slides", `${slides.length} slides generated`);

      // ── Step 2: Upload visuals + synthesize audio for each slide ──
      const audioUrls: string[] = [];
      const visualUrls: string[] = [];

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slideIndex = i + 1;

        // A. Synthesize narration audio via Cloud TTS
        sendProgress(
          "uploading_audio",
          `Slide ${slideIndex}/${slides.length}`,
        );
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

        // B. Upload inline image (multimodal) or generate via Imagen (legacy fallback)
        sendProgress(
          "uploading_visuals",
          `Slide ${slideIndex}/${slides.length}`,
        );
        try {
          if (slide.visualBase64) {
            // Multimodal path: image was generated inline by Gemini
            let base64Data = slide.visualBase64;
            if (base64Data.startsWith("data:")) {
              base64Data = base64Data.split(",")[1];
            }
            const buffer = Buffer.from(base64Data, "base64");
            const destination = `debriefs/${sessionId}/visual-slide-${slideIndex}.png`;
            const url = await uploadFile(buffer, destination, "image/png");
            visualUrls.push(url);
            slide.visualUrl = url;
          } else {
            // Legacy fallback: generate image separately via Imagen 3
            let visualBase64 = await generateSlideInfographic(slide.visual);
            if (visualBase64) {
              if (visualBase64.startsWith("data:")) {
                visualBase64 = visualBase64.split(",")[1];
              }
              const buffer = Buffer.from(visualBase64, "base64");
              const destination = `debriefs/${sessionId}/visual-slide-${slideIndex}.jpg`;
              const url = await uploadFile(buffer, destination, "image/jpeg");
              visualUrls.push(url);
              slide.visualUrl = url;
            } else {
              visualUrls.push("");
            }
          }
        } catch (error) {
          console.error(
            `[debrief] Visual upload failed for slide ${slideIndex}:`,
            error,
          );
          visualUrls.push("");
        }

        // Clean up base64 from slide payload
        delete (slide as any).visualBase64;
        delete (slide as any).audioBase64;
      }

      console.log(
        `[debrief] Debrief complete (${usedMultimodal ? "multimodal" : "legacy"}). Audio: ${audioUrls.filter((a) => !!a).length}/${slides.length}, Visuals: ${visualUrls.filter((v) => !!v).length}/${slides.length}`,
      );

      sendProgress("finalizing");

      // Send the final result
      res.write(
        `event: result\ndata: ${JSON.stringify({ slides, audioUrls, visualUrls })}\n\n`,
      );
      res.end();
    } catch (error: any) {
      console.error("[debrief] Fatal error in debrief route:", error);
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: error.message || "Internal Server Error" })}\n\n`,
      );
      res.end();
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

