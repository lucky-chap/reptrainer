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
  const apiKeyHeader = req.headers["x-api-key"];

  const isValid =
    (authHeader && authHeader === `Bearer ${env.API_SECRET_KEY}`) ||
    (apiKeyHeader && apiKeyHeader === env.API_SECRET_KEY);

  if (!isValid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
