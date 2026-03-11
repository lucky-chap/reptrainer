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
  private systemPrompt: string | null;
  private voiceName: string | null;
  private isConnecting = false;

  constructor(
    ws: WebSocket,
    systemPrompt: string | null,
    voiceName: string | null,
  ) {
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

    if (!this.systemPrompt || !this.voiceName) {
      console.log("[GeminiLiveProxy] Waiting for setup message…");
      return;
    }

    if (this.isConnecting) {
      console.log(
        "[GeminiLiveProxy] Already connecting, skipping duplicate call",
      );
      return;
    }

    if (this.session) {
      console.log(
        "[GeminiLiveProxy] Closing existing session before reconnecting",
      );
      this.close();
    }

    this.isConnecting = true;

    const { setup } = getLiveSetupConfig(
      env.GOOGLE_CLOUD_PROJECT,
      env.GOOGLE_CLOUD_LOCATION,
      this.systemPrompt,
      this.voiceName,
    );

    console.log(
      "[GeminiLiveProxy] Connecting to Gemini Live with model:",
      setup.model,
    );

    try {
      this.session = await genAI.live.connect({
        model: setup.model,
        config: {
          systemInstruction: setup.system_instruction,
          tools: setup.tools.map((tool: any) => {
            if (tool.function_declarations) {
              return { functionDeclarations: tool.function_declarations };
            }
            return tool;
          }),
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
                .automatic_activity_detection
                .start_of_speech_sensitivity as any,
              endOfSpeechSensitivity: setup.realtime_input_config
                .automatic_activity_detection.end_of_speech_sensitivity as any,
            },
          },
          responseModalities: setup.generation_config
            .response_modalities as any,
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

      this.isConnecting = false;
      console.log("[GeminiLiveProxy] Session established successfully");

      // Once session is established, send the initial greeting
      this.session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              {
                text: "Hello! Please introduce yourself briefly in 1-2 sentences based on your persona, then stop and wait for me to respond.",
              },
            ],
          },
        ],
        turnComplete: true,
      });

      // Wait briefly to ensure client is ready for the "connected" signal
      setTimeout(() => {
        if (this.ws.readyState === 1) {
          console.log("[GeminiLiveProxy] Sending 'connected' signal to client");
          this.send({ type: "connected" });
        }
      }, 100);
    } catch (err) {
      this.isConnecting = false;
      console.error("[GeminiLiveProxy] Failed to connect to Gemini Live:", err);
      this.send({
        type: "error",
        message:
          "Failed to connect to AI: " +
          (err instanceof Error ? err.message : String(err)),
      });
    }
  }

  /**
   * Handles an incoming message from the frontend WebSocket client.
   */
  handleClientMessage(data: string): void {
    try {
      const msg = JSON.parse(data);

      if (msg.type === "setup") {
        console.log(
          `[GeminiLiveProxy] Received setup message — voice=${msg.voiceName}, promptLength=${msg.systemPrompt?.length}`,
        );
        this.systemPrompt = msg.systemPrompt;
        this.voiceName = msg.voiceName;
        this.connect();
        return;
      }

      if (!this.session) {
        // Silently drop non-setup messages if session isn't ready
        return;
      }

      switch (msg.type) {
        case "audio":
          // Forward audio chunk to Gemini (logging every 50th chunk to avoid spam)
          if (Math.random() < 0.02)
            console.log(`[GeminiLiveProxy] Relaying client audio chunk`);

          this.session?.sendRealtimeInput({
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
      msg.toolCallCancellation ? "toolCallCancellation" : null,
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

          this.send({
            type: "audio",
            data: dataToSend,
            mimeType: part.inlineData.mimeType || "audio/pcm",
          });
        }
      }
    }

    // Turn complete — can arrive with or without modelTurn
    if (msg.serverContent?.turnComplete) {
      this.send({ type: "turn_complete" });
    }

    // Interrupted — AI was cut off by user
    if (msg.serverContent?.interrupted) {
      console.log(`[GeminiLiveProxy] AI was interrupted!`);
      this.send({ type: "interrupted" });
    }

    // Input transcription (user's speech → text)
    const inputTx =
      msg.serverContent?.inputTranscription ||
      msg.serverContent?.input_audio_transcription;
    if (inputTx) {
      if (inputTx.text) {
        // Handle both camelCase (SDK) and snake_case (REST) for isFinal
        const isFinal = !!(inputTx.isFinal ?? inputTx.is_final);
        console.log(
          `[GeminiLiveProxy] Input transcription: "${inputTx.text.substring(0, 60)}..." isFinal=${isFinal}`,
        );
        this.send({
          type: "input_transcription",
          text: inputTx.text,
          isFinal,
        });
      }
    }

    // Output transcription (model's speech to text)
    const outputTx =
      msg.serverContent?.outputTranscription ||
      msg.serverContent?.output_audio_transcription;
    if (outputTx) {
      if (outputTx.text) {
        // Handle both camelCase (SDK) and snake_case (REST) for isFinal
        const isFinal = !!(outputTx.isFinal ?? outputTx.is_final);
        console.log(
          `[GeminiLiveProxy] Output transcription: "${outputTx.text.substring(0, 60)}..." isFinal=${isFinal}`,
        );
        // some of the tool call output was interfering with the transcription
        let cleanText = outputTx.text;

        // Strip tool call artifacts like update_persona_mood{...} or results like {success:true}
        cleanText = cleanText.replace(/(\w+)\{.*?\}/g, "");
        cleanText = cleanText.replace(/\{success:true\}/g, "");
        // Strip control tokens or weird sequences like <ctrl43> (they kept appearing in the transcription)
        cleanText = cleanText.replace(/<.*?>/g, "");

        // If the entire text was just tool metadata, don't send an empty transcription
        if (!cleanText.trim()) return;

        this.send({
          type: "output_transcription",
          text: cleanText,
          isFinal,
        });
      }
    }

    // Tool calls (insights & end_roleplay)
    if (msg.toolCall?.functionCalls) {
      for (const call of msg.toolCall.functionCalls) {
        console.log(
          `[GeminiLiveProxy] Tool call from Gemini: name=${call.name}, id=${call.id}, args=${JSON.stringify(call.args)}`,
        );
        this.send({
          type: "tool_call",
          name: call.name,
          args: call.args,
          id: call.id,
        });

        // Auto-respond to tool calls on the backend
        try {
          this.session?.sendToolResponse({
            functionResponses: [
              {
                name: call.name,
                response: { success: true },
                id: call.id,
              },
            ],
          });
          console.log(
            `[GeminiLiveProxy] Tool response sent for ${call.name} (id=${call.id})`,
          );
        } catch (err) {
          console.error(
            `[GeminiLiveProxy] Failed to send tool response for ${call.name}:`,
            err,
          );
        }
      }
    }

    // Handle tool call cancellations (e.g. when user interrupts)
    if (msg.toolCallCancellation) {
      console.log(
        `[GeminiLiveProxy] Tool call cancelled: ${JSON.stringify(msg.toolCallCancellation)}`,
      );
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
