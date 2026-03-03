import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

/**
 * Middleware to protect routes that require server-side API secret key access.
 */
export function requireApiSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${env.API_SECRET_KEY}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
