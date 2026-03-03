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

export const sessionRoutes: Router = Router();

const evaluateSessionSchema = z.object({
  transcript: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().min(1),
  intensityLevel: z.number().int().min(1).max(3),
  durationSeconds: z.number().min(0),
});

/**
 * POST /api/session/evaluate
 * Evaluates a sales roleplay session transcript using Gemini AI.
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
