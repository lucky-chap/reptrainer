import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

import { geminiLiveTools, geminiLiveToolsDict } from "./adk-tools.js";
import { getLiveSetupConfig } from "./vertex.js";
import { getKnowledgeBase, getKnowledgeMetadata } from "./knowledge.js";
import type { WebSocket } from "ws";
import type { KnowledgeMetadata } from "@reptrainer/shared";

/**
 * Manages a single Gemini Live session, acting as a bridge between
 * a frontend WebSocket client and the Gemini Live API.
 */
export class GeminiLiveProxy {
  private session: any = null;
  private isConnecting = false;
  private searchCount = 0;
  private hasGreeted: boolean = false;
  private suppressInitialOutput: boolean = false;
  private suppressAfterToolCall: boolean = false;
  private aiSpeaking: boolean = false;
  private knowledgeMetadata: KnowledgeMetadata | undefined;
  private metadataPromise: Promise<[any, any]> | null = null;

  /**
   * Callback fired when the first model greeting is detected in this session.
   */
  public onGreeted?: () => void;

  constructor(
    private ws: WebSocket,
    private config: {
      systemPrompt: string | null;
      voiceName: string | null;
      teamId?: string;
      hasGreeted?: boolean;
      personaId?: string;
      personaName?: string;
      representativeName?: string;
      ragCorpusId?: string;
      knowledgeMetadata?: KnowledgeMetadata;
    },
  ) {
    this.hasGreeted = config.hasGreeted || false;
    this.knowledgeMetadata = config.knowledgeMetadata;

    if (this.config.teamId) {
      console.log(
        `[GeminiLiveProxy] Pre-fetching team knowledge for teamId=${this.config.teamId}`,
      );
      this.metadataPromise = Promise.all([
        getKnowledgeBase(this.config.teamId),
        getKnowledgeMetadata(this.config.teamId),
      ]);
    }
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

    if (!this.config.systemPrompt || !this.config.voiceName) {
      console.log("[GeminiLiveProxy] Waiting for setup message…");
      return;
    }

    if (this.isConnecting) {
      console.log(
        "[GeminiLiveProxy] Already connecting, skipping duplicate call",
      );
      return;
    }

    this.isConnecting = true;

    if (this.session) {
      console.log(
        "[GeminiLiveProxy] Closing existing session before reconnecting",
      );
      this.close();
    }

    if (this.metadataPromise) {
      try {
        const [kb, metadata] = await this.metadataPromise;
        this.config.ragCorpusId = kb?.ragCorpusId;
        this.knowledgeMetadata = metadata;
        console.log(
          `[GeminiLiveProxy] Loaded RAG Corpus ID: ${this.config.ragCorpusId || "none"}, Metadata: ${this.knowledgeMetadata ? "present" : "none"}`,
        );
      } catch (err) {
        console.error("[GeminiLiveProxy] Failed to load team knowledge:", err);
      }
    }

    let finalPrompt = this.config.systemPrompt;
    if (this.hasGreeted) {
      finalPrompt = `${this.config.systemPrompt}\n\nIMPORTANT: The conversation has already started. DO NOT introduce yourself or repeat your greeting. Simply continue where we left off. If the user hasn't spoken yet, just wait silently for their input.`;
    }

    const { setup } = getLiveSetupConfig(
      env.GOOGLE_CLOUD_PROJECT,
      env.GOOGLE_CLOUD_LOCATION,
      finalPrompt,
      this.config.voiceName,
      this.config.ragCorpusId,
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
          // realtimeInputConfig: {
          //   automaticActivityDetection: {
          //     prefixPaddingMs:
          //       setup.realtime_input_config.automatic_activity_detection
          //         .prefix_padding_ms,
          //     silenceDurationMs:
          //       setup.realtime_input_config.automatic_activity_detection
          //         .silence_duration_ms,
          //     startOfSpeechSensitivity: setup.realtime_input_config
          //       .automatic_activity_detection
          //       .start_of_speech_sensitivity as any,
          //     endOfSpeechSensitivity: setup.realtime_input_config
          //       .automatic_activity_detection.end_of_speech_sensitivity as any,
          //   },
          // },
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
            this.isConnecting = false;
            this.send({ type: "connected" });
          },
          onmessage: (msg: any) => {
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

      console.log("[GeminiLiveProxy] Connection command initiated");
    } catch (err) {
      this.isConnecting = false;
      this.session = null;
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
  handleClientMessage(data: string | Buffer): void {
    if (Buffer.isBuffer(data)) {
      this.handleClientAudio(data);
      return;
    }

    try {
      const msg = JSON.parse(data);

      // Any client activity stops suppression
      this.suppressInitialOutput = false;

      if (msg.type === "setup") {
        if (this.session || this.isConnecting) {
          console.log(
            "[GeminiLiveProxy] Ignoring duplicate setup message (session already active or connecting)",
          );
          return;
        }
        console.log(
          `[GeminiLiveProxy] Received setup message — voice=${msg.voiceName}, promptLength=${msg.systemPrompt?.length}`,
        );
        this.config.systemPrompt = msg.systemPrompt;
        this.config.voiceName = msg.voiceName;
        this.hasGreeted = msg.hasGreeted || false;
        this.suppressInitialOutput = msg.hasGreeted || false;
        this.connect();
        return;
      }

      if (!this.session) {
        return;
      }

      switch (msg.type) {
        case "audio":
          this.session?.sendRealtimeInput({
            audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
          });
          break;

        case "text":
          console.log(`[GeminiLiveProxy] Relaying client text: "${msg.text}"`);
          this.session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: msg.text }] }],
            turnComplete: true,
          });
          break;

        case "log_insight":
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
   * Handles raw PCM audio input from the client.
   */
  private handleClientAudio(data: Buffer): void {
    if (!this.session) return;

    // Client activity stops initial suppression
    this.suppressInitialOutput = false;

    try {
      this.session.sendRealtimeInput({
        audio: {
          data: data.toString("base64"),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (err) {
      console.error("[GeminiLiveProxy] Failed to send client audio:", err);
    }
  }

  /**
   * Handles messages from the Gemini Live session and relays them to the client.
   */
  private async handleGeminiMessage(msg: any): Promise<void> {
    // Audio output
    if (msg.serverContent?.modelTurn?.parts) {
      const parts = msg.serverContent.modelTurn.parts;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (this.suppressInitialOutput) {
            continue;
          }

          let dataToSend: string | Buffer = part.inlineData.data;
          if (typeof dataToSend === "string") {
            dataToSend = Buffer.from(dataToSend, "base64");
          }

          this.aiSpeaking = true;
          // Send as raw binary frame if it's a Buffer
          if (Buffer.isBuffer(dataToSend)) {
            this.ws.send(dataToSend);
          } else {
            this.send({
              type: "audio",
              data: dataToSend,
              mimeType: part.inlineData.mimeType || "audio/pcm",
            });
          }
          if (!this.hasGreeted) {
            this.hasGreeted = true;
            this.onGreeted?.();
          }
        }
      }
    }

    // Turn complete
    if (msg.serverContent?.turnComplete) {
      this.aiSpeaking = false;
      // If we were suppressing output after a silent tool call, just clear
      // the flag and swallow this turn_complete so the frontend doesn't
      // see a phantom turn.
      if (this.suppressAfterToolCall) {
        this.suppressAfterToolCall = false;
        return;
      }
      this.send({ type: "turn_complete" });
    }

    // Interrupted
    if (msg.serverContent?.interrupted) {
      console.log(`[GeminiLiveProxy] AI was interrupted!`);
      this.aiSpeaking = false;
      this.send({ type: "interrupted" });
    }

    // Transcription handling (input & output)
    const inputTx =
      msg.serverContent?.inputTranscription ||
      msg.serverContent?.input_audio_transcription;
    if (inputTx?.text) {
      const isFinal = !!(inputTx.isFinal ?? inputTx.is_final);
      this.send({
        type: "input_transcription",
        text: inputTx.text,
        isFinal,
      });
    }

    const outputTx =
      msg.serverContent?.outputTranscription ||
      msg.serverContent?.output_audio_transcription;
    if (outputTx?.text) {
      if (!this.suppressInitialOutput) {
        const isFinal = !!(outputTx.isFinal ?? outputTx.is_final);
        if (!this.hasGreeted) {
          this.hasGreeted = true;
          this.onGreeted?.();
        }
        this.aiSpeaking = true;

        let cleanText = outputTx.text;
        cleanText = cleanText.replace(/(\w+)\{.*?\}/g, "");
        cleanText = cleanText.replace(/\{success:true\}/g, "");
        cleanText = cleanText.replace(/<.*?>/g, "");

        if (cleanText.trim()) {
          this.send({
            type: "output_transcription",
            text: cleanText,
            isFinal,
          });
        }
      }
    }

    // Tool calls — execute directly and batch responses
    if (msg.toolCall?.functionCalls) {
      const calls = msg.toolCall.functionCalls;

      console.log(`[GeminiLiveProxy] Tool calls received: ${calls.length}`);

      // Relay tool calls to the frontend for UI display
      for (const call of calls) {
        console.log(
          `🛠️  [Gemini Tool Call] ${call.name}(${JSON.stringify(call.args)})`,
        );
        this.send({
          type: "tool_call",
          name: call.name,
          args: call.args,
          id: call.id,
        });
      }

      // Execute all tools and collect responses
      const functionResponses: any[] = [];

      for (const call of calls) {
        let result: any = { success: true };

        try {
          if (call.name === "research_competitor") {
            // research_competitor is the only tool that needs real execution
            const toolFn = geminiLiveToolsDict[call.name];
            if (toolFn) {
              const context = {
                actions: {
                  stateDelta: {
                    knowledgeMetadata: this.knowledgeMetadata,
                    searchCount: this.searchCount,
                  },
                },
              };
              result = await (toolFn as any).execute({
                args: call.args,
                context,
              });
              // Sync search count back
              if (context.actions.stateDelta.searchCount !== undefined) {
                this.searchCount = context.actions.stateDelta.searchCount;
              }
            }
          }
          // All other tools (log_sales_insight, log_objection, update_persona_mood,
          // end_roleplay) are "silent" logging tools — just return {success: true}
        } catch (err) {
          console.error(`[GeminiLiveProxy] Tool ${call.name} failed:`, err);
          result = { error: `Tool execution failed: ${err}` };
        }

        functionResponses.push({
          id: call.id,
          name: call.name,
          response: result,
        });
      }

      // Suppress the duplicate audio/transcription Gemini generates after
      // receiving tool responses. The tool result data is still in the model's
      // context and will be used in the next response to user input.
      this.suppressAfterToolCall = true;

      // Send ALL responses in a single batch
      console.log(
        `[GeminiLiveProxy] Sending ${functionResponses.length} tool responses (suppressing post-response output).`,
      );
      try {
        this.session?.sendToolResponse({ functionResponses });
      } catch (err) {
        console.error(`[GeminiLiveProxy] Failed to send tool responses:`, err);
      }
    }

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
    if (this.ws.readyState === 1 /* WebSocket.OPEN */) {
      this.ws.send(JSON.stringify(obj));
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
