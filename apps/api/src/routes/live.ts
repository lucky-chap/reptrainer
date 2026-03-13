import type { IncomingMessage } from "node:http";
import type { WebSocket, WebSocketServer } from "ws";
import { env } from "../config/env.js";
import { GeminiLiveProxy } from "../services/gemini-live.js";

interface SessionInfo {
  ws: WebSocket;
  hasGreeted: boolean;
}

const activeSessions = new Map<string, SessionInfo>();

/**
 * Registers the /api/live WebSocket route on the given WebSocket server.
 *
 */
export function registerLiveRoute(wss: WebSocketServer): void {
  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    // Only handle /api/live
    if (url.pathname !== "/api/live") {
      ws.close(4004, "Not Found");
      return;
    }

    // Authenticate
    const apiKey = url.searchParams.get("apiKey");
    if (apiKey !== env.API_SECRET_KEY) {
      console.warn("[Live] Unauthorized WebSocket connection attempt");
      ws.close(4001, "Unauthorized");
      return;
    }

    // Read config from query params (optional if sending via 'setup' message)
    const systemPrompt = url.searchParams.get("systemPrompt");
    const voiceName = url.searchParams.get("voiceName");
    const teamId = url.searchParams.get("teamId");
    const sessionId = url.searchParams.get("sessionId");

    console.log(
      `[Live] New WebSocket connection — voice=${voiceName || "default"}, teamId=${teamId || "unknown"}, sessionId=${sessionId || "none"}, promptLength=${systemPrompt?.length || 0}`,
    );

    let initialHasGreeted = false;
    if (sessionId) {
      const existing = activeSessions.get(sessionId);
      if (existing) {
        if (existing.ws.readyState === 1 /* OPEN */) {
          console.warn(
            `[Live] Duplicate session detected for sessionId=${sessionId}. Closing previous connection.`,
          );
          existing.ws.close(4002, "Duplicate session");
        }
        // Preserve greeting state across reconnections
        initialHasGreeted = existing.hasGreeted;
      }
      activeSessions.set(sessionId, { ws, hasGreeted: initialHasGreeted });
    }

    const proxy = new GeminiLiveProxy(ws, {
      systemPrompt,
      voiceName,
      teamId: teamId || undefined,
      hasGreeted: initialHasGreeted,
    });

    // Update greeting state when proxy detects model output
    proxy.onGreeted = () => {
      if (sessionId) {
        const session = activeSessions.get(sessionId);
        if (session) {
          session.hasGreeted = true;
          console.log(`[Live] Session ${sessionId} marked as greeted`);
        }
      }
    };

    // Wire up client to Gemini
    ws.on("message", (data: Buffer | string) => {
      const message = typeof data === "string" ? data : data.toString("utf-8");
      proxy.handleClientMessage(message);
    });

    ws.on("close", (code, reason) => {
      console.log(
        `[Live] Client disconnected: code=${code} reason=${reason.toString()}`,
      );
      // Don't delete immediately to allow for reconnection within the same sessionId
      // and preserve hasGreeted state. The Map will be overwritten/cleaned on next connection or app restart.
      proxy.close();
    });

    ws.on("error", (err) => {
      console.error("[Live] WebSocket error:", err);
      // Same here — keep session info to preserve greeting state
      proxy.close();
    });
  });
}
