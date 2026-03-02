import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";

export const authRoutes: Router = Router();

/**
 * POST /api/auth/token
 * Returns the Gemini API key for client-side Live API usage.
 * In production, replace with ephemeral token generation.
 */
authRoutes.post("/token", (_req: Request, res: Response) => {
  const apiKey = env.GEMINI_API_KEY;
  res.json({ apiKey });
});
