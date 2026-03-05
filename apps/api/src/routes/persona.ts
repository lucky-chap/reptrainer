import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireApiSecret } from "../middleware/auth.js";
import { generatePersona } from "../services/gemini.js";
import { generatePersonaAvatar } from "../services/vertex.js";

export const personaRoutes: Router = Router();

const generatePersonaSchema = z.object({
  companyName: z.string().min(1),
  description: z.string().min(1),
  targetCustomer: z.string().min(1),
  industry: z.string().min(1),
  objections: z.array(z.string()).min(1),
});

/**
 * POST /api/persona/generate
 * Generates a buyer persona using Gemini AI based on product context.
 */
personaRoutes.post(
  "/generate",
  requireApiSecret,
  validateBody(generatePersonaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const persona = await generatePersona(req.body);
      res.json(persona);
    } catch (error) {
      next(error);
    }
  },
);

const generateAvatarSchema = z.object({
  gender: z.enum(["male", "female"]),
  role: z.string().min(1),
});

/**
 * POST /api/persona/generate-avatar
 * Generates an avatar image using Vertex AI Imagen.
 */
personaRoutes.post(
  "/generate-avatar",
  requireApiSecret,
  validateBody(generateAvatarSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gender, role } = req.body;
      const avatarDataUrl = await generatePersonaAvatar(gender, role);
      res.json({ avatarDataUrl });
    } catch (error) {
      next(error);
    }
  },
);
