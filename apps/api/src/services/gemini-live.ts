import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import { getLiveSetupConfig } from "./vertex.js";
import type { WebSocket } from "ws";

/**
 * Manages a single Gemini Live session, acting as a bridge between
 * a frontend WebSocket client and the Gemini Live API.
 *
 * The Gemini Live session runs server-side where Vertex AI project-based
 * authentication is fully supported.
 */
export class GeminiLiveProxy {
  private session: any = null;
  private ws: WebSocket;
  private systemPrompt: string;
  private voiceName: string;

  constructor(ws: WebSocket, systemPrompt: string, voiceName: string) {
    this.ws = ws;
    this.systemPrompt = systemPrompt;
    this.voiceName = voiceName;
  }

  /**
   * Opens the Gemini Live session and begins relaying messages.
   */
  async connect(): Promise<void> {
    const genAI = new GoogleGenAI({
      vertexai: true,
      project: env.GOOGLE_CLOUD_PROJECT,
      location: env.GOOGLE_CLOUD_LOCATION,
    });

    const { setup } = getLiveSetupConfig(
      env.GOOGLE_CLOUD_PROJECT,
      env.GOOGLE_CLOUD_LOCATION,
      this.systemPrompt,
      this.voiceName,
    );

    console.log("[GeminiLiveProxy] Connecting to Gemini Live…");

    this.session = await genAI.live.connect({
      model: setup.model,
      config: {
        systemInstruction: setup.system_instruction,
        tools: setup.tools.map((tool: any) => ({
          functionDeclarations: tool.function_declarations,
        })),
        inputAudioTranscription: setup.input_audio_transcription,
        outputAudioTranscription: setup.output_audio_transcription,
        realtimeInputConfig: {
          automaticActivityDetection: {
            prefixPaddingMs:
              setup.realtime_input_config.automatic_activity_detection
                .prefix_padding_ms,
            silenceDurationMs:
              setup.realtime_input_config.automatic_activity_detection
                .silence_duration_ms,
            startOfSpeechSensitivity: setup.realtime_input_config
              .automatic_activity_detection.start_of_speech_sensitivity as any,
            endOfSpeechSensitivity: setup.realtime_input_config
              .automatic_activity_detection.end_of_speech_sensitivity as any,
          },
        },
        responseModalities: setup.generation_config.response_modalities as any,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName:
                setup.generation_config.speech_config.voice_config
                  .prebuilt_voice_config.voice_name,
            },
          },
        },
      },
      callbacks: {
        onopen: () => {
          console.log("[GeminiLiveProxy] Gemini session opened");
        },
        onmessage: (msg: any) => {
          // console.log("[GeminiLiveProxy] Received message from Gemini");
          this.handleGeminiMessage(msg);
        },
        onclose: (e: any) => {
          console.log(
            `[GeminiLiveProxy] Gemini session closed: code=${e?.code} reason=${e?.reason}`,
          );
          this.send({ type: "closed", code: e?.code, reason: e?.reason });
        },
        onerror: (err: any) => {
          console.error("[GeminiLiveProxy] Gemini error:", err);
          this.send({
            type: "error",
            message: "AI session encountered an error.",
          });
        },
      },
    });

    console.log("[GeminiLiveProxy] Session established");

    // Once session is established, send the initial greeting
    this.session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [
            {
              text: "Hello! Please start the conversation now based on the persona and scenario in your instructions.",
            },
          ],
        },
      ],
      turnComplete: true,
    });

    // Wait briefly to ensure client is ready for the "connected" signal
    setTimeout(() => {
      if (this.ws.readyState === 1) {
        this.send({ type: "connected" });
      }
    }, 100);
  }

  /**
   * Handles an incoming message from the frontend WebSocket client.
   */
  handleClientMessage(data: string): void {
    if (!this.session) return;

    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case "audio":
          // Forward audio chunk to Gemini (logging every 50th chunk to avoid spam)
          if (Math.random() < 0.02)
            console.log(`[GeminiLiveProxy] Relaying client audio chunk`);

          this.session.sendRealtimeInput({
            audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
          });
          break;

        case "text":
          console.log(`[GeminiLiveProxy] Relaying client text: "${msg.text}"`);
          // Forward text input to Gemini
          this.session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: msg.text }] }],
            turnComplete: true,
          });
          break;

        case "log_insight":
          // Forward a system command for manual insight logging
          this.session.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [{ text: "[SYSTEM_COMMAND: LOG_CURRENT_INSIGHT]" }],
              },
            ],
            turnComplete: true,
          });
          break;

        default:
          console.warn(
            "[GeminiLiveProxy] Unknown client message type:",
            msg.type,
          );
      }
    } catch (err) {
      console.error("[GeminiLiveProxy] Failed to parse client message:", err);
    }
  }

  /**
   * Handles messages from the Gemini Live session and relays them to the client.
   */
  private handleGeminiMessage(msg: any): void {
    // Log all message types for debugging
    const types = [
      msg.serverContent?.modelTurn ? "modelTurn" : null,
      msg.serverContent?.turnComplete ? "turnComplete" : null,
      msg.serverContent?.inputTranscription ? "inputTranscription" : null,
      msg.serverContent?.outputTranscription ? "outputTranscription" : null,
      msg.toolCall ? "toolCall" : null,
    ].filter(Boolean);
    if (types.length > 0) {
      console.log(`[GeminiLiveProxy] Message types: ${types.join(", ")}`);
    }

    // Audio output
    if (msg.serverContent?.modelTurn?.parts) {
      const parts = msg.serverContent.modelTurn.parts;
      for (const part of parts) {
        if (part.inlineData?.data) {
          let dataToSend = part.inlineData.data;

          // Ensure it's base64 for the frontend
          if (typeof dataToSend !== "string") {
            dataToSend = Buffer.from(dataToSend).toString("base64");
          }

          console.log(
            `[GeminiLiveProxy] Relaying audio chunk: size=${dataToSend.length}, mime=${part.inlineData.mimeType}`,
          );
          this.send({
            type: "audio",
            data: dataToSend,
            mimeType: part.inlineData.mimeType || "audio/pcm",
          });
        } else {
          console.log(
            `[GeminiLiveProxy] Part without inlineData:`,
            Object.keys(part),
          );
        }
      }

      if (msg.serverContent.turnComplete) {
        this.send({ type: "turn_complete" });
      }
    }

    // Input transcription
    if (msg.serverContent?.inputTranscription) {
      const tx = msg.serverContent.inputTranscription;
      if (tx.text) {
        this.send({
          type: "input_transcription",
          text: tx.text,
          isFinal: !!tx.is_final,
        });
      }
    }

    // Output transcription
    if (msg.serverContent?.outputTranscription) {
      const tx = msg.serverContent.outputTranscription;
      if (tx.text) {
        this.send({
          type: "output_transcription",
          text: tx.text,
          isFinal: !!tx.is_final,
        });
      }
    }

    // Tool calls (insights & end_roleplay)
    if (msg.toolCall?.functionCalls) {
      for (const call of msg.toolCall.functionCalls) {
        this.send({
          type: "tool_call",
          name: call.name,
          args: call.args,
          id: call.id,
        });

        // Auto-respond to tool calls on the backend
        this.session?.sendToolResponse({
          functionResponses: [
            {
              name: call.name,
              response: { success: true },
              id: call.id,
            },
          ],
        });
      }
    }
  }

  /**
   * Sends a JSON message to the frontend WebSocket client.
   */
  private send(obj: Record<string, any>): void {
    const json = JSON.stringify(obj);
    if (this.ws.readyState === 1 /* WebSocket.OPEN */) {
      // console.log(`[GeminiLiveProxy] Sending ${obj.type} (${json.length} bytes)`);
      this.ws.send(json);
    } else {
      console.warn(
        `[GeminiLiveProxy] Cannot send ${obj.type}, readyState=${this.ws.readyState}`,
      );
    }
  }

  /**
   * Closes the Gemini Live session.
   */
  close(): void {
    try {
      this.session?.close();
    } catch (err) {
      console.error("[GeminiLiveProxy] Error closing Gemini session:", err);
    }
    this.session = null;
  }
}
