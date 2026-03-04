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
