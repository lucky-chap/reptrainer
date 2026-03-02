import "dotenv/config";
import { env } from "./config/env.js";

import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";

import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authRoutes } from "./routes/auth.js";
import { personaRoutes } from "./routes/persona.js";
import { sessionRoutes } from "./routes/session.js";
import { healthRoutes } from "./routes/health.js";

const app: Express = express();

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/persona", personaRoutes);
app.use("/api/session", sessionRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(env.PORT, () => {
  console.log(`🚀 RepTrainer API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});

export default app;
