import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireApiSecret } from "../middleware/auth.js";
import { generateMultimodalPersona } from "../services/vertex.js";

export const personaRoutes: Router = Router();

const generatePersonaSchema = z.object({
  teamId: z.string().min(1),
  personalityType: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  country: z.string().optional(),
  competitorUrl: z.string().url().optional(),
  companyName: z.string().optional(),
});

/**
 * POST /api/persona/generate
 * Generates a buyer persona with avatar in a single multimodal Gemini call.
 */
personaRoutes.post(
  "/generate",
  requireApiSecret,
  validateBody(generatePersonaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const persona = await generateMultimodalPersona(req.body);
      res.json(persona);
    } catch (error) {
      next(error);
    }
  },
);
