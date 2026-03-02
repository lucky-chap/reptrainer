import type { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  details?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ERROR] ${statusCode} - ${message}`, {
    stack: err.stack,
    details: err.details,
  });

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && {
      details: err.details,
      stack: err.stack,
    }),
  });
}
