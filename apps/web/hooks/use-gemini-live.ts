"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { GEMINI_LIVE_MODEL } from "@reptrainer/shared";
import { fetchAuthToken } from "@/app/actions/api";

type RoleGroup = "user" | "model";

// Modality constants
const Modality = {
  AUDIO: "AUDIO",
  TEXT: "TEXT",
} as const;

export interface TranscriptEntry {
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface SalesInsight {
  insight: string;
  timestamp: number;
}

interface UseGeminiLiveOptions {
  systemPrompt: string;
  voiceName?: string;
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  onPersonaLeft?: () => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [insights, setInsights] = useState<SalesInsight[]>([]);
  const [personaLeft, setPersonaLeft] = useState(false);

  // Use refs for callbacks to avoid dependency churn
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const connectingOscRef = useRef<OscillatorNode | null>(null);
  const connectingGainRef = useRef<GainNode | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const startTimeRef = useRef<number>(0);
  const isCleanedUpRef = useRef(false);
  const personaLeftRef = useRef(false);

  // Recording refs
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mixedStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(
    null,
  );
  const [isRecording, setIsRecording] = useState(false);

  // Buffer for incremental transcription text
  const inputTranscriptBufferRef = useRef("");
  const outputTranscriptBufferRef = useRef("");
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

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

  // Cleanup all audio resources
  const cleanup = useCallback(() => {
    if (isCleanedUpRef.current) return;
    isCleanedUpRef.current = true;

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        /* ignore */
      }
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        /* ignore */
      }
      sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (micCtxRef.current) {
      try {
        micCtxRef.current.close();
      } catch {
        /* ignore */
      }
      micCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      try {
        playbackCtxRef.current.close();
      } catch {
        /* ignore */
      }
      playbackCtxRef.current = null;
    }
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {
        /* ignore */
      }
      currentSourceRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    // Recording cleanup
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    recordedChunksRef.current = [];
    mixedStreamDestRef.current = null;
    setIsRecording(false);

    if (connectingOscRef.current) {
      try {
        connectingOscRef.current.stop();
        connectingOscRef.current.disconnect();
      } catch (e) {}
      connectingOscRef.current = null;
    }
    if (connectingGainRef.current) {
      try {
        connectingGainRef.current.disconnect();
      } catch (e) {}
      connectingGainRef.current = null;
    }
  }, []);

  // Connection sound effects
  const playSoundEffect = useCallback(
    (type: "connecting" | "success" | "stop") => {
      if (!playbackCtxRef.current || playbackCtxRef.current.state === "closed")
        return;
      const ctx = playbackCtxRef.current;

      // Use a ref to track the connecting oscillator
      if (type === "stop") {
        if (connectingOscRef.current) {
          try {
            connectingOscRef.current.stop();
            connectingOscRef.current.disconnect();
          } catch (e) {}
          connectingOscRef.current = null;
        }
        if (connectingGainRef.current) {
          connectingGainRef.current.disconnect();
          connectingGainRef.current = null;
        }
        return;
      }

      if (type === "connecting") {
        // Pulse sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);

        // Simple pulse effect
        gain.gain.setValueAtTime(0, ctx.currentTime);
        for (let i = 0; i < 60; i += 2) {
          gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + i);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i + 1);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        connectingOscRef.current = osc;
        connectingGainRef.current = gain;
        return;
      }

      if (type === "success") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    },
    [],
  );

  // Convert Float32 PCM to Int16 PCM
  const float32ToInt16 = useCallback(
    (float32Array: Float32Array): Int16Array => {
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return int16Array;
    },
    [],
  );

  // Downsample from source rate to 16kHz
  const downsample = useCallback(
    (buffer: Float32Array, fromRate: number, toRate: number): Float32Array => {
      if (fromRate === toRate) return buffer;
      const ratio = fromRate / toRate;
      const newLength = Math.round(buffer.length / ratio);
      const result = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const index = Math.round(i * ratio);
        result[i] = buffer[Math.min(index, buffer.length - 1)];
      }
      return result;
    },
    [],
  );

  // Play audio from the queue
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const ctx = playbackCtxRef.current;
    if (!ctx || ctx.state === "closed") {
      isPlayingRef.current = false;
      return;
    }

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }

    while (audioQueueRef.current.length > 0 && !isCleanedUpRef.current) {
      const pcmData = audioQueueRef.current.shift()!;
      const int16Array = new Int16Array(pcmData);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 0x8000;
      }

      if (float32Array.length === 0) continue;

      // Output is 24kHz mono
      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Connect to recording mixer if active
      if (mixedStreamDestRef.current) {
        source.connect(mixedStreamDestRef.current);
      }

      currentSourceRef.current = source;

      await new Promise<void>((resolve) => {
        source.onended = () => {
          if (currentSourceRef.current === source) {
            currentSourceRef.current = null;
          }
          resolve();
        };
        source.start();
      });
    }

    isPlayingRef.current = false;
  }, []);

  // Check if text contains a closing phrase
  const containsClosingPhrase = useCallback((text: string): boolean => {
    const lower = text.toLowerCase();
    return CLOSING_PHRASES.some((phrase) => lower.includes(phrase));
  }, []);

  // Add a transcript entry helper
  const addTranscriptEntry = useCallback(
    (role: "user" | "model", text: string) => {
      if (!text.trim()) return;

      const now = Date.now();
      const currentTranscript = transcriptRef.current;
      let mergedText = text.trim();
      let isNewEntry = true;

      // Merge consecutive messages from same role if within 5 seconds
      const MERGE_WINDOW_MS = 5000;

      if (currentTranscript.length > 0) {
        const lastEntry = currentTranscript[currentTranscript.length - 1];
        const entryTimeMs = lastEntry.timestamp + startTimeRef.current;

        if (lastEntry.role === role && now - entryTimeMs < MERGE_WINDOW_MS) {
          // Prevent appending the exact same text if the transcription API duplicates part.text
          if (
            !lastEntry.text.includes(text.trim()) &&
            !text.trim().includes(lastEntry.text)
          ) {
            mergedText =
              lastEntry.text +
              (lastEntry.text.endsWith(" ") || text.startsWith(" ")
                ? ""
                : " ") +
              text.trim();
          } else {
            // If it's a longer version of the same text (e.g. from outputTx API), replace it
            mergedText =
              text.trim().length > lastEntry.text.length
                ? text.trim()
                : lastEntry.text;
          }

          isNewEntry = false;

          // Update the last entry
          const updatedEntry = { ...lastEntry, text: mergedText };
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
          },
        ];
      }

      setTranscript([...transcriptRef.current]);
      optionsRef.current.onTranscriptUpdate?.([...transcriptRef.current]);

      // Detect AI ending the meeting from its speech using the FULL merged text
      if (
        role === "model" &&
        !personaLeftRef.current &&
        containsClosingPhrase(mergedText)
      ) {
        console.log(
          "[GeminiLive] Closing phrase detected in AI speech:",
          mergedText.substring(0, 80),
        );
        personaLeftRef.current = true;
        setPersonaLeft(true);
        optionsRef.current.onPersonaLeft?.();

        // Clear audio queue so the AI goes silent after the closing statement
        audioQueueRef.current = [];
        isPlayingRef.current = false;

        // Stop sending mic audio
        if (processorRef.current) {
          try {
            processorRef.current.disconnect();
          } catch {
            /* ignore */
          }
        }
      }
    },
    [containsClosingPhrase],
  );

  // Start recording the session
  const startRecording = useCallback(() => {
    if (!mixedStreamDestRef.current) return;

    try {
      const recorder = new MediaRecorder(mixedStreamDestRef.current.stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        console.log("[Recorder] Session recording stopped");
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      console.log("[Recorder] Session recording started");
    } catch (err) {
      console.error("[Recorder] Failed to start recording:", err);
    }
  }, []);

  // Stop and download recording
  const downloadRecording = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return;

    const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-session-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const getRecordingBlob = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return null;
    return new Blob(recordedChunksRef.current, { type: "audio/webm" });
  }, []);

  // Connect to Vertex AI Multimodal Live
  const connect = useCallback(async () => {
    try {
      isCleanedUpRef.current = false;
      setIsConnecting(true);
      playSoundEffect("connecting");
      setPersonaLeft(false);
      personaLeftRef.current = false;

      // Get access token and project info from Node.js backend
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const systemPrompt = optionsRef.current.systemPrompt;
      const voiceName = optionsRef.current.voiceName || "Kore";

      const tokenData = await fetchAuthToken(systemPrompt, voiceName);

      if (!tokenData.token || !tokenData.project) {
        throw new Error("Failed to get authentication data from backend.");
      }

      const { token, project, location, setupConfig } = tokenData;

      // Set up playback audio context (24kHz for Gemini output)
      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playbackCtx;

      // Set up recording mixer
      const mixer = playbackCtx.createMediaStreamDestination();
      mixedStreamDestRef.current = mixer;

      // Request microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = micStream;

      // Connect mic to mixer
      const mixerMicSource = playbackCtx.createMediaStreamSource(micStream);
      mixerMicSource.connect(mixer);

      // Reset transcript
      transcriptRef.current = [];
      setTranscript([]);
      startTimeRef.current = Date.now();
      inputTranscriptBufferRef.current = "";
      outputTranscriptBufferRef.current = "";

      // Construct Vertex AI WebSocket URL
      const host = `${location}-aiplatform.googleapis.com`;
      const url = `wss://${host}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent?access_token=${token}`;

      console.log("[VertexAI] Connecting to", host);
      const ws = new WebSocket(url);

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("[VertexAI] WebSocket opened. Sending setup...");
        // Send setup message provided by the backend
        if (setupConfig) {
          ws.send(JSON.stringify(setupConfig));
        } else {
          // Fallback if backend didn't provide setupConfig
          const fallbackSetup = {
            setup: {
              model: `projects/${project}/locations/${location}/publishers/google/models/${GEMINI_LIVE_MODEL}`,
              generation_config: {
                response_modalities: ["AUDIO", "TEXT"],
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
          console.error("[VertexAI] Raw data:", msgData);
          return;
        }

        // Log everything during development to see the protocol
        console.log(
          "[VertexAI] Received:",
          JSON.stringify(message).substring(0, 200),
        );

        // Handle Setup Complete
        if (message.setupComplete || message.setup_complete) {
          console.log("[VertexAI] Setup completed successfully");
          playSoundEffect("stop");
          playSoundEffect("success");

          // Trigger initial AI greeting
          if (ws.readyState === WebSocket.OPEN) {
            console.log("[VertexAI] Triggering initial AI greeting...");
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
            // Handle audio data — skip if persona already left
            const inlineData = part.inline_data || part.inlineData;
            const audioData = inlineData?.data;
            if (audioData && !personaLeftRef.current) {
              console.log("[VertexAI] Received audio data chunk");
              try {
                const binaryString = atob(audioData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                audioQueueRef.current.push(bytes.buffer);
                playAudioQueue();
              } catch (err) {
                console.error("[VertexAI] Audio decode error:", err);
              }
            }

            // modelTurn text parts can contain tool/JSON artifacts and duplicate
            // what outputTranscription already provides cleanly — ignore for transcript
            if (part.text) {
              console.log(
                "[VertexAI] Model text part (ignored for transcript):",
                part.text,
              );
            }
          }
        }

        // Handle turn completion — flush any remaining buffered output text
        if (serverContent?.turnComplete || serverContent?.turn_complete) {
          const buffered = outputTranscriptBufferRef.current.trim();
          if (buffered) {
            addTranscriptEntry("model", buffered);
          }
          outputTranscriptBufferRef.current = "";
        }

        // Handle Tool Calls (Function Calls)
        const toolCall = message.toolCall || message.tool_call;
        if (toolCall?.functionCalls || toolCall?.function_calls) {
          const calls = toolCall.functionCalls || toolCall.function_calls;
          console.log("[VertexAI] Tool Call received:", calls);

          for (const call of calls) {
            if (call.name === "log_sales_insight") {
              console.log("!!! SALES INSIGHT LOGGED:", call.args);
              const newInsight: SalesInsight = {
                insight: call.args.insight,
                timestamp: call.args.timestamp || getDuration(),
              };
              setInsights((prev) => [...prev, newInsight]);
            }

            // Always respond to tool calls to avoid hanging the model
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  tool_response: {
                    function_responses: [
                      {
                        name: call.name,
                        response: { success: true },
                        id: call.id,
                      },
                    ],
                  },
                }),
              );
            }
          }
        }

        // Handle transcription
        const inputTx =
          message.inputTranscription ||
          message.input_transcription ||
          serverContent?.inputTranscription ||
          serverContent?.input_transcription;

        if (inputTx?.text) {
          // Accumulate incremental transcription
          inputTranscriptBufferRef.current += inputTx.text;
          // If the message says it's final, add to the UI transcript
          if (inputTx.finished || inputTx.is_final) {
            addTranscriptEntry("user", inputTranscriptBufferRef.current);
            inputTranscriptBufferRef.current = "";
          }
        }

        const outputTx =
          message.outputTranscription ||
          message.output_transcription ||
          serverContent?.outputTranscription ||
          serverContent?.output_transcription;

        if (outputTx?.text) {
          // Accumulate incremental AI transcription
          outputTranscriptBufferRef.current += outputTx.text;
          // Only commit to transcript when the transcription chunk is final
          if (outputTx.finished || outputTx.is_final) {
            const finalText = outputTranscriptBufferRef.current.trim();
            if (finalText) {
              addTranscriptEntry("model", finalText);
            }
            outputTranscriptBufferRef.current = "";
          }
        }

        // Handle interruption
        if (message.interrupted || serverContent?.interrupted) {
          audioQueueRef.current = [];
          isPlayingRef.current = false;
        }
      };

      ws.onerror = (e) => {
        console.error("[VertexAI] WebSocket error:", e);
        optionsRef.current.onError?.("WebSocket connection error");
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
            if (audioChunkCount % 100 === 0) {
              console.log(`[VertexAI] Sent ${audioChunkCount} audio chunks`);
            }
          }
        },
        sendClientContent: (content: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log("[VertexAI] Sending client content:", content);
            ws.send(JSON.stringify({ client_content: content }));
          }
        },
        close: () => ws.close(),
      };

      // Set up microphone streaming
      micCtxRef.current = new AudioContext();
      const micSource = micCtxRef.current.createMediaStreamSource(
        mediaStreamRef.current,
      );
      const processor = micCtxRef.current.createScriptProcessor(4096, 1, 1);

      micSource.connect(processor);
      processor.connect(micCtxRef.current.destination);

      const actualSampleRate = micCtxRef.current.sampleRate;

      processor.onaudioprocess = (e) => {
        if (
          !sessionRef.current ||
          isCleanedUpRef.current ||
          ws.readyState !== WebSocket.OPEN
        )
          return;
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsample(inputData, actualSampleRate, 16000);
        const int16Data = float32ToInt16(downsampled);

        const uint8Array = new Uint8Array(int16Data.buffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        try {
          sessionRef.current.sendRealtimeInput({
            media_chunks: [
              {
                data: base64,
                mime_type: "audio/l16;rate=16000",
              },
            ],
          });
        } catch {
          /* ignore */
        }
      };

      sourceRef.current = micSource;
      processorRef.current = processor;
    } catch (error) {
      console.error("[VertexAI] Connection error:", error);
      setIsConnecting(false);
      setIsConnected(false);
      cleanup();
      optionsRef.current.onError?.(
        error instanceof Error ? error.message : "Failed to connect",
      );
    }
  }, [cleanup, downsample, float32ToInt16, playAudioQueue, addTranscriptEntry]);

  // Disconnect (user-initiated)
  const disconnect = useCallback(() => {
    // Mark as user-initiated BEFORE closing, so the onclose handler
    // doesn't misinterpret this as the AI ending the meeting
    isCleanedUpRef.current = true;

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // Ignore close errors
      }
      sessionRef.current = null;
    }
    cleanup();
    setIsConnected(false);
    setIsConnecting(false);
  }, [cleanup]);

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

  // Get duration in seconds
  const getDuration = useCallback(() => {
    if (startTimeRef.current === 0) return 0;
    return Math.round((Date.now() - startTimeRef.current) / 1000);
  }, []);

  // Cleanup on unmount only (stable dependency — no callback refs)
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        try {
          sessionRef.current.close();
        } catch {
          /* */
        }
        sessionRef.current = null;
      }
      // Inline cleanup to avoid stale ref issues
      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
        } catch {
          /* */
        }
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {
          /* */
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (micCtxRef.current) {
        try {
          micCtxRef.current.close();
        } catch {
          /* */
        }
      }
      if (playbackCtxRef.current) {
        try {
          playbackCtxRef.current.close();
        } catch {
          /* */
        }
      }
    };
  }, []); // Empty deps — only runs on unmount

  return {
    isConnected,
    isConnecting,
    transcript,
    insights,
    personaLeft,
    connect,
    disconnect,
    sendText,
    logManualInsight,
    getDuration,
    isRecording,
    startRecording,
    downloadRecording,
    getRecordingBlob,
  };
}
