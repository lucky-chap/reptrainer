"use client";

import { useState, useRef, useCallback } from "react";
import { GEMINI_LIVE_MODEL } from "@reptrainer/shared";
import { TranscriptEntry, SalesInsight } from "./gemini-types";
import { fetchAuthToken } from "@/app/actions/api";

export interface UseGeminiSocketOptions {
  systemPrompt: string;
  voiceName?: string;
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  onSetupComplete: () => void;
  onAudioData: (base64: string) => void;
  onToolCallEndRoleplay: () => void;
}

export function useGeminiSocket(options: UseGeminiSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [insights, setInsights] = useState<SalesInsight[]>([]);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const startTimeRef = useRef<number>(0);

  const inputTranscriptBufferRef = useRef("");
  const outputTranscriptBufferRef = useRef("");

  // Closing phrases that indicate the AI is ending the meeting
  const CLOSING_PHRASES = [
    "thank you for your time",
    "thanks for your time",
    "appreciate your time",
    "going to pass",
    "we're going to pass",
    "not the right fit",
    "isn't the right fit",
    "not what we're looking for",
    "isn't what we're looking for",
    "need to wrap up",
    "need to wrap this up",
    "wrap up here",
    "end this here",
    "end this meeting",
    "i've heard enough",
    "i have heard enough",
    "enough value here",
    "move forward with this",
    "don't see this working",
    "not going to work for us",
    "good luck with everything",
    "good luck to you",
    "have a good day",
    "have a good one",
    "take care",
    "goodbye",
    "good bye",
  ];

  // Check if text contains a closing phrase
  const containsClosingPhrase = useCallback((text: string): boolean => {
    const lower = text.toLowerCase();
    return CLOSING_PHRASES.some((phrase) => lower.includes(phrase));
  }, []);

  // Get duration in seconds
  const getDuration = useCallback(() => {
    if (startTimeRef.current === 0) return 0;
    return Math.round((Date.now() - startTimeRef.current) / 1000);
  }, []);

  // Add a transcript entry helper (supports streaming)
  const addTranscriptEntry = useCallback(
    (role: "user" | "model", text: string, isIncremental: boolean = false) => {
      if (!text) return; // Allow empty trimmed for incremental if needed, but usually chunks have text

      const now = Date.now();
      const currentTranscript = transcriptRef.current;
      let mergedText = text;
      let isNewEntry = true;

      // Merge consecutive messages from same role if within 5 seconds OR if current is streaming
      const MERGE_WINDOW_MS = 5000;

      if (currentTranscript.length > 0) {
        const lastEntry = currentTranscript[currentTranscript.length - 1];
        const entryTimeMs = lastEntry.timestamp + startTimeRef.current;

        // If same role and recent OR the last entry was a streaming entry of the same role
        if (
          lastEntry.role === role &&
          (now - entryTimeMs < MERGE_WINDOW_MS || lastEntry.isStreaming)
        ) {
          if (isIncremental) {
            // Append the chunk
            mergedText = lastEntry.text + text;
          } else {
            // This is a final/full text replacement
            // Only replace if it's actually different or more complete
            if (
              text.trim().length >= lastEntry.text.trim().length ||
              !lastEntry.isStreaming
            ) {
              mergedText = text;
            } else {
              mergedText = lastEntry.text;
            }
          }

          isNewEntry = false;

          // Update the last entry
          const updatedEntry: TranscriptEntry = {
            ...lastEntry,
            text: mergedText,
            isStreaming: isIncremental,
          };
          transcriptRef.current = [
            ...currentTranscript.slice(0, -1),
            updatedEntry,
          ];
        }
      }

      if (isNewEntry) {
        transcriptRef.current = [
          ...currentTranscript,
          {
            role,
            text: mergedText,
            timestamp: now - startTimeRef.current,
            isStreaming: isIncremental,
          },
        ];
      }

      setTranscript([...transcriptRef.current]);
      optionsRef.current.onTranscriptUpdate?.([...transcriptRef.current]);

      // Detect AI ending the meeting from its speech
      if (
        role === "model" &&
        !isIncremental && // Detect on final/stable text
        containsClosingPhrase(mergedText)
      ) {
        console.log(
          "[GeminiLive] Closing phrase detected in AI speech:",
          mergedText.substring(0, 80),
        );
        optionsRef.current.onToolCallEndRoleplay();
      }
    },
    [containsClosingPhrase],
  );

  const connectSocket = useCallback(
    async (
      token: string,
      project: string,
      location: string,
      setupConfig: any,
    ) => {
      return new Promise<void>((resolve, reject) => {
        // Construct Vertex AI WebSocket URL
        const host = `${location}-aiplatform.googleapis.com`;
        const url = `wss://${host}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent?access_token=${token}`;

        console.log("[VertexAI] Connecting to", host);
        const ws = new WebSocket(url);

        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
          console.log("[VertexAI] WebSocket opened. Sending setup...");
          if (setupConfig) {
            ws.send(JSON.stringify(setupConfig));
          } else {
            const fallbackSetup = {
              setup: {
                model: `projects/${project}/locations/${location}/publishers/google/models/${GEMINI_LIVE_MODEL}`,
                generation_config: {
                  response_modalities: ["AUDIO"],
                },
                realtime_input_config: {
                  automatic_activity_detection: {
                    silence_duration_ms: 600,
                  },
                },
              },
            };
            ws.send(JSON.stringify(fallbackSetup));
          }
          setIsConnected(true);
          setIsConnecting(false);
          optionsRef.current.onConnectionChange?.(true);
        };

        ws.onmessage = (event) => {
          let msgData = event.data;
          if (msgData instanceof ArrayBuffer) {
            msgData = new TextDecoder().decode(msgData);
          }

          let message;
          try {
            message = JSON.parse(msgData as string);
          } catch (err) {
            console.error("[VertexAI] Failed to parse message:", err);
            return;
          }

          if (message.setupComplete || message.setup_complete) {
            console.log("[VertexAI] Setup completed successfully");
            optionsRef.current.onSetupComplete();

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  client_content: {
                    turns: [
                      {
                        role: "user",
                        parts: [
                          {
                            text: "[SYSTEM_GREETING_START: Please initiate the conversation as the buyer.]",
                          },
                        ],
                      },
                    ],
                    turn_complete: true,
                  },
                }),
              );
            }
            resolve();
            return;
          }

          const serverContent = message.serverContent || message.server_content;

          if (
            serverContent?.modelTurn?.parts ||
            serverContent?.model_turn?.parts
          ) {
            const parts =
              serverContent.modelTurn?.parts || serverContent.model_turn?.parts;
            for (const part of parts) {
              const inlineData = part.inline_data || part.inlineData;
              const audioData = inlineData?.data;
              if (audioData) {
                optionsRef.current.onAudioData(audioData);
              }
            }
          }

          if (serverContent?.turnComplete || serverContent?.turn_complete) {
            const buffered = outputTranscriptBufferRef.current.trim();
            if (buffered) {
              addTranscriptEntry("model", buffered);
            }
            outputTranscriptBufferRef.current = "";
          }

          const toolCall = message.toolCall || message.tool_call;
          if (toolCall?.functionCalls || toolCall?.function_calls) {
            const calls = toolCall.functionCalls || toolCall.function_calls;
            console.log(`[GeminiSocket] Received ${calls.length} tool calls`);
            for (const call of calls) {
              console.log(
                `[GeminiSocket] Processing tool call: ${call.name}`,
                call.args,
              );
              if (call.name === "log_sales_insight") {
                const insightContent = call.args.insight;
                const insightTime = call.args.timestamp || getDuration();
                const newInsight: SalesInsight = {
                  insight: insightContent,
                  timestamp: insightTime,
                };
                console.log("[GeminiSocket] New sales insight:", newInsight);
                setInsights((prev) => [...prev, newInsight]);
              }

              if (call.name === "end_roleplay") {
                console.log("[GeminiSocket] Persona requested to end roleplay");
                optionsRef.current.onToolCallEndRoleplay();
              }

              if (ws.readyState === WebSocket.OPEN) {
                const response = {
                  tool_response: {
                    function_responses: [
                      {
                        name: call.name,
                        response: { success: true },
                        id: call.id,
                      },
                    ],
                  },
                };
                console.log("[GeminiSocket] Sending tool response:", response);
                ws.send(JSON.stringify(response));
              }
            }
          }

          const inputTx =
            message.inputTranscription ||
            message.input_transcription ||
            serverContent?.inputTranscription ||
            serverContent?.input_transcription;
          if (inputTx?.text) {
            addTranscriptEntry("user", inputTx.text, true);
            if (inputTx.finished || inputTx.is_final) {
              addTranscriptEntry(
                "user",
                inputTranscriptBufferRef.current + inputTx.text,
                false,
              );
              inputTranscriptBufferRef.current = "";
            } else {
              inputTranscriptBufferRef.current += inputTx.text;
            }
          }

          const outputTx =
            message.outputTranscription ||
            message.output_transcription ||
            serverContent?.outputTranscription ||
            serverContent?.output_transcription;
          if (outputTx?.text) {
            if (outputTx.finished || outputTx.is_final) {
              addTranscriptEntry(
                "model",
                outputTranscriptBufferRef.current + outputTx.text,
                false,
              );
              outputTranscriptBufferRef.current = "";
            } else {
              outputTranscriptBufferRef.current += outputTx.text;
            }
          }

          if (message.interrupted || serverContent?.interrupted) {
            // We will let orchestrator handle the interruption to audio layer
          }
        };

        ws.onerror = (e) => {
          console.error("[VertexAI] WebSocket error:", e);
          optionsRef.current.onError?.("WebSocket connection error");
          reject(new Error("WebSocket connection error"));
        };

        ws.onclose = (e) => {
          console.log(`[VertexAI] Closed: code=${e.code} reason="${e.reason}"`);
          if (inputTranscriptBufferRef.current.trim()) {
            addTranscriptEntry("user", inputTranscriptBufferRef.current);
            inputTranscriptBufferRef.current = "";
          }
          if (outputTranscriptBufferRef.current.trim()) {
            addTranscriptEntry("model", outputTranscriptBufferRef.current);
            outputTranscriptBufferRef.current = "";
          }
          setIsConnected(false);
          setIsConnecting(false);
          optionsRef.current.onConnectionChange?.(false);
        };

        let audioChunkCount = 0;
        sessionRef.current = {
          sendRealtimeInput: (input: any) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ realtime_input: input }));
              audioChunkCount++;
            }
          },
          sendClientContent: (content: any) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ client_content: content }));
            }
          },
          close: () => ws.close(),
        };
      });
    },
    [addTranscriptEntry, getDuration],
  );

  const disconnectSocket = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {}
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendAudioData = useCallback((base64: string) => {
    if (sessionRef.current) {
      sessionRef.current.sendRealtimeInput({
        media_chunks: [{ data: base64, mime_type: "audio/l16;rate=16000" }],
      });
    }
  }, []);

  // Send a text message to the session
  const sendText = useCallback(
    (text: string) => {
      if (!sessionRef.current) return;

      addTranscriptEntry("user", text);

      sessionRef.current.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turn_complete: true,
      });
    },
    [addTranscriptEntry],
  );

  // Manually trigger an insight (meta-command)
  const logManualInsight = useCallback(() => {
    if (!sessionRef.current) return;
    // Send a "hidden" command that the system prompt handles
    sessionRef.current.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: "[SYSTEM_COMMAND: LOG_CURRENT_INSIGHT]" }],
        },
      ],
      turn_complete: true,
    });
  }, []);

  const resetState = useCallback(() => {
    transcriptRef.current = [];
    setTranscript([]);
    startTimeRef.current = Date.now();
    inputTranscriptBufferRef.current = "";
    outputTranscriptBufferRef.current = "";
    setIsConnecting(true);
  }, []);

  return {
    isConnected,
    isConnecting,
    setIsConnecting,
    transcript,
    setTranscript,
    transcriptRef,
    insights,
    connectSocket,
    disconnectSocket,
    sendAudioData,
    sendText,
    logManualInsight,
    getDuration,
    resetState,
  };
}
