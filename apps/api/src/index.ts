import "dotenv/config";
import { env } from "./config/env.js";

import { createServer } from "node:http";
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { WebSocketServer } from "ws";

import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { personaRoutes } from "./routes/persona.js";
import { productRoutes } from "./routes/product.js";
import { sessionRoutes } from "./routes/session.js";
import { healthRoutes } from "./routes/health.js";
import { registerLiveRoute } from "./routes/live.js";

const app: Express = express();

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/api/health", healthRoutes);
app.use("/api/persona", personaRoutes);
app.use("/api/product", productRoutes);
app.use("/api/session", sessionRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── HTTP + WebSocket Server ────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Register the /api/live WebSocket route
registerLiveRoute(wss);

server.listen(env.PORT, () => {
  console.log(`🚀 RepTrainer API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   WebSocket: ws://localhost:${env.PORT}/api/live`);
});

export default app;
