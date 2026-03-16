import "dotenv/config";
import { env } from "./config/env.js";

import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";

import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { personaRoutes } from "./routes/persona.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { sessionRoutes } from "./routes/session.js";
import { healthRoutes } from "./routes/health.js";
import { uploadRoutes } from "./routes/upload.js";

const app: Express = express();

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(requestLogger);

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/api/health", healthRoutes);
app.use("/api/persona", personaRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/upload", uploadRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── HTTP Server ───────────────────────────────────────────────────────────

app.listen(env.PORT, () => {
  console.log(`🚀 RepTrainer API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});

export default app;
