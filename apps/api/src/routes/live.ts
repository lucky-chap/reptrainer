import type { IncomingMessage } from "node:http";
import type { WebSocket, WebSocketServer } from "ws";
import { env } from "../config/env.js";
import { GeminiLiveProxy } from "../services/gemini-live.js";

/**
 * Registers the /api/live WebSocket route on the given WebSocket server.
 *
 * The client connects with query params:
 *   ?apiKey=<secret>&systemPrompt=<encoded>&voiceName=<voice>
 *
 * Once connected, messages are JSON objects:
 *   → client sends: { type: "audio", data: base64 } or { type: "text", text: "..." }
 *   ← server sends: { type: "audio"|"input_transcription"|"output_transcription"|"tool_call"|... }
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

    // Read config from query params
    const systemPrompt = url.searchParams.get("systemPrompt") || "";
    const voiceName = url.searchParams.get("voiceName") || "Kore";

    if (!systemPrompt) {
      ws.close(4002, "Missing systemPrompt");
      return;
    }

    console.log(
      `[Live] New WebSocket connection — voice=${voiceName}, promptLength=${systemPrompt.length}`,
    );

    const proxy = new GeminiLiveProxy(ws, systemPrompt, voiceName);

    // Wire up client → Gemini
    ws.on("message", (data: Buffer | string) => {
      const message = typeof data === "string" ? data : data.toString("utf-8");
      proxy.handleClientMessage(message);
    });

    ws.on("close", (code, reason) => {
      console.log(
        `[Live] Client disconnected: code=${code} reason=${reason.toString()}`,
      );
      proxy.close();
    });

    ws.on("error", (err) => {
      console.error("[Live] WebSocket error:", err);
      proxy.close();
    });

    // Open the Gemini session
    try {
      await proxy.connect();
    } catch (err) {
      console.error("[Live] Failed to connect to Gemini Live:", err);
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: "error",
            message:
              err instanceof Error ? err.message : "Failed to connect to AI",
          }),
        );
        ws.close(4003, "Gemini connection failed");
      }
    }
  });
}
