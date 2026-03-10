"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  TranscriptEntry,
  SalesInsight,
  ObjectionLog,
  PersonaMood,
} from "./gemini-types";

export interface UseGeminiLiveOptions {
  systemPrompt: string;
  voiceName?: string;
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  onPersonaLeft?: () => void;
}

// Build the WebSocket URL from the API URL
function getWsUrl(systemPrompt: string, voiceName: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const secretKey = process.env.NEXT_PUBLIC_API_SECRET_KEY;

  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not defined in environment variables",
    );
  }
  if (!secretKey) {
    throw new Error(
      "NEXT_PUBLIC_API_SECRET_KEY is not defined in environment variables",
    );
  }

  // Swap http(s) → ws(s)
  const wsBase = apiUrl.replace(/^http/, "ws");

  const params = new URLSearchParams({
    apiKey: secretKey,
    // systemPrompt is now sent via 'setup' message to avoid URL length limits
    voiceName,
  });

  return `${wsBase}/api/live?${params.toString()}`;
}

export function useGeminiLive(options: UseGeminiLiveOptions) {
  // --- State ---
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [personaLeft, setPersonaLeft] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [insights, setInsights] = useState<SalesInsight[]>([]);
  const [objections, setObjections] = useState<ObjectionLog[]>([]);
  const [moods, setMoods] = useState<PersonaMood[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // --- Refs ---
  const optionsRef = useRef(options);
  // --- Refs for Realtime State ---
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<
    Array<{ buffer: ArrayBuffer; mimeType?: string }>
  >([]);
  const isPlayingRef = useRef(false);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]); // All active scheduled sources
  const pendingBuffersRef = useRef(0); // Count of buffers still playing
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const mixerRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const isConnectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorConnectedRef = useRef(false);

  const nextStartTimeRef = useRef(0);

  // --- Reconnection State ---
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;
  const isIntentionalDisconnectRef = useRef(false);

  // --- Helper: Transcript Management ---
  const addTranscriptEntry = useCallback(
    (role: "user" | "model", text: string, isStreaming: boolean = false) => {
      if (!text) return;
      const now = Date.now();
      const elapsed = startTimeRef.current ? now - startTimeRef.current : 0;

      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        const MERGE_WINDOW = 5000;

        // If same role and within merge window or is streaming
        if (
          last &&
          last.role === role &&
          (last.isStreaming ||
            now - (last.timestamp + (startTimeRef.current ?? 0)) < MERGE_WINDOW)
        ) {
          let newText: string;
          if (role === "model") {
            newText = last.text.trim() + " " + text.trim();
          } else {
            if (text.toLowerCase().startsWith(last.text.toLowerCase())) {
              newText = text;
            } else {
              newText = last.text.trim() + " " + text.trim();
            }
          }

          const updated = {
            ...last,
            text: newText,
            isStreaming,
          };
          const next = [...prev.slice(0, -1), updated];
          optionsRef.current.onTranscriptUpdate?.(next);
          return next;
        } else if (last && last.isStreaming && last.role !== role) {
          // If switching roles and the previous entry was streaming, finalize it
          const finalized = { ...last, isStreaming: false };
          const nextEntry: TranscriptEntry = {
            role,
            text,
            timestamp: elapsed,
            isStreaming,
          };
          const next = [...prev.slice(0, -1), finalized, nextEntry];
          optionsRef.current.onTranscriptUpdate?.(next);
          return next;
        } else {
          const nextEntry: TranscriptEntry = {
            role,
            text,
            timestamp: elapsed,
            isStreaming,
          };
          const next = [...prev, nextEntry];
          optionsRef.current.onTranscriptUpdate?.(next);
          return next;
        }
      });
    },
    [],
  );

  // --- Audio Buffer Pool for Memory Efficiency ---
  // (Removed due to float padding bug causing silent audio gaps)

  // --- Audio: Playback Queue ---
  const playAudioQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || !audioCtxRef.current) {
      return;
    }

    const ctx = audioCtxRef.current;

    // Initialize nextStartTime if we are underrunning or starting fresh
    if (
      pendingBuffersRef.current === 0 ||
      nextStartTimeRef.current < ctx.currentTime
    ) {
      nextStartTimeRef.current = Math.max(
        ctx.currentTime + 0.15, // 150ms jitter buffer
        nextStartTimeRef.current,
      );
    }

    isPlayingRef.current = true;
    setIsAISpeaking(true);

    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift()!;
      if (chunk.buffer.byteLength === 0) continue;

      let sampleRate = 24000;
      if (chunk.mimeType) {
        const match = chunk.mimeType.match(/rate=(\d+)/);
        if (match) {
          sampleRate = parseInt(match[1], 10);
        }
      }

      const byteLen = chunk.buffer.byteLength;
      const safeLen = byteLen - (byteLen % 2); // Avoid odd-byte errors
      const int16 = new Int16Array(chunk.buffer, 0, safeLen / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;

      const buffer = ctx.createBuffer(1, float32.length, sampleRate);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      if (mixerRef.current) source.connect(mixerRef.current);

      const duration = buffer.duration;

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += duration;

      // Track this source for interrupt cleanup
      scheduledSourcesRef.current.push(source);
      pendingBuffersRef.current++;

      source.onended = () => {
        // Remove from tracked sources
        const idx = scheduledSourcesRef.current.indexOf(source);
        if (idx >= 0) scheduledSourcesRef.current.splice(idx, 1);

        // Only mark playback done when ALL pending buffers have finished
        pendingBuffersRef.current--;
        if (
          pendingBuffersRef.current <= 0 &&
          audioQueueRef.current.length === 0
        ) {
          pendingBuffersRef.current = 0;
          setIsAISpeaking(false);
          isPlayingRef.current = false;
        }
      };
    }
  }, []);

  // --- Handle messages from the backend WebSocket ---
  const handleServerMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "connected":
            console.log("[GeminiLive] Backend session established");
            isConnectedRef.current = true;
            setIsConnected(true);
            setIsConnecting(false);
            optionsRef.current.onConnectionChange?.(true);
            break;

          case "audio": {
            // Decode base64 PCM audio
            // Optional: console.log(`[GeminiLive] Received audio chunk: dataLen=${msg.data?.length}, type=${typeof msg.data}`);
            const bin = atob(msg.data);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            audioQueueRef.current.push({
              buffer: bytes.buffer,
              mimeType: msg.mimeType,
            });
            playAudioQueue();
            break;
          }

          case "turn_complete":
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.isStreaming) {
                const updated = { ...last, isStreaming: false };
                const next = [...prev.slice(0, -1), updated];
                optionsRef.current.onTranscriptUpdate?.(next);
                return next;
              }
              return prev;
            });
            break;

          case "input_transcription":
            addTranscriptEntry("user", msg.text, !msg.isFinal);
            break;

          case "output_transcription":
            addTranscriptEntry("model", msg.text, !msg.isFinal);
            break;

          case "interrupted":
            // The AI was interrupted. Clear its queue and stop ALL playing sources
            // so we don't hear a repeated phrase!
            console.log("[GeminiLive] AI Interrupted! Clearing queue.");
            audioQueueRef.current = [];
            nextStartTimeRef.current = 0;
            pendingBuffersRef.current = 0;
            isPlayingRef.current = false;
            setIsAISpeaking(false);
            // Stop all currently scheduled audio sources
            for (const src of scheduledSourcesRef.current) {
              try {
                src.stop();
              } catch (_) {
                // already stopped
              }
            }
            scheduledSourcesRef.current = [];
            break;

          case "tool_call":
            if (msg.name === "log_sales_insight") {
              setInsights((prev) => [
                ...prev,
                {
                  insight: msg.args.insight,
                  timestamp: Date.now() - (startTimeRef.current ?? 0),
                },
              ]);
            }
            if (msg.name === "log_objection") {
              setObjections((prev) => [
                ...prev,
                {
                  objectionType: msg.args.objectionType,
                  repResponse: msg.args.repResponse,
                  sentiment: msg.args.sentiment,
                  timestamp: Date.now() - (startTimeRef.current ?? 0),
                },
              ]);
            }
            if (msg.name === "update_persona_mood") {
              setMoods((prev) => [
                ...prev,
                {
                  trust: msg.args.trust,
                  interest: msg.args.interest,
                  frustration: msg.args.frustration,
                  dealLikelihood: msg.args.dealLikelihood,
                  timestamp: Date.now() - (startTimeRef.current ?? 0),
                },
              ]);
            }
            if (msg.name === "end_roleplay") {
              // Wait for all buffered audio to finish playing before ending
              const waitForAudioDrain = async () => {
                const maxWait = 15000; // safety cap: 15 seconds
                const start = Date.now();
                while (
                  (isPlayingRef.current ||
                    audioQueueRef.current.length > 0 ||
                    pendingBuffersRef.current > 0) &&
                  Date.now() - start < maxWait
                ) {
                  await new Promise((r) => setTimeout(r, 200));
                }
                // Give a small extra buffer for the last chunk to finish
                await new Promise((r) => setTimeout(r, 1000));
                setPersonaLeft(true);
                optionsRef.current.onPersonaLeft?.();
              };
              waitForAudioDrain();
            }
            break;

          case "error":
            console.error("[GeminiLive] Server error:", msg.message);
            optionsRef.current.onError?.(msg.message);
            break;

          case "closed":
            console.log("[GeminiLive] Server closed session");
            isConnectedRef.current = false;
            setIsConnected(false);
            optionsRef.current.onConnectionChange?.(false);
            break;

          default:
            console.log("[GeminiLive] Unknown message type:", msg.type);
        }
      } catch (err) {
        console.error("[GeminiLive] Failed to parse server message:", err);
      }
    },
    [addTranscriptEntry, playAudioQueue],
  );

  // --- Audio Resource Cleanup ---
  const cleanupAudioResources = useCallback(() => {
    processorConnectedRef.current = false;
    micSourceRef.current = null;
    // Stop all scheduled audio sources
    for (const src of scheduledSourcesRef.current) {
      try {
        src.stop();
      } catch (_) {
        // already stopped
      }
    }
    scheduledSourcesRef.current = [];
    pendingBuffersRef.current = 0;
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(console.error);
      audioCtxRef.current = null;
    }
    mixerRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextStartTimeRef.current = 0;
  }, []);

  // --- Core Lifecycle: Connect / Disconnect ---
  const connect = useCallback(
    async (isReconnect = false) => {
      isIntentionalDisconnectRef.current = false;
      try {
        if (isReconnect) {
          setIsReconnecting(true);
          setConnectionError(null);
        } else {
          setIsConnecting(true);
          setConnectionError(null);
          setPersonaLeft(false);
          setTranscript([]);
          setInsights([]);
          setObjections([]);
          setMoods([]);
          startTimeRef.current = Date.now();
          audioQueueRef.current = [];
          reconnectAttemptsRef.current = 0;
        }

        // Check for existing AudioContext and close if needed
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          await audioCtxRef.current.close();
        }

        // 1. Setup Audio
        const ctx = new AudioContext({ sampleRate: 24000 });
        audioCtxRef.current = ctx;
        await ctx.resume();
        const mixer = ctx.createMediaStreamDestination();
        mixerRef.current = mixer;

        const mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        micStreamRef.current = mic;
        const micSource = ctx.createMediaStreamSource(mic);
        micSourceRef.current = micSource;
        micSource.connect(mixer);

        const processor = ctx.createScriptProcessor(2048, 1, 1);
        processor.onaudioprocess = (e) => {
          if (
            !wsRef.current ||
            !isConnectedRef.current ||
            isMutedRef.current ||
            !processorConnectedRef.current
          )
            return;
          const input = e.inputBuffer.getChannelData(0);

          // Linear interpolation downsample to 16kHz
          const targetRate = 16000;
          const ratio = ctx.sampleRate / targetRate;
          const outLen = Math.floor(input.length / ratio);
          const downsampled = new Int16Array(outLen);
          let offsetResult = 0;
          let offsetInput = 0;
          while (offsetResult < outLen) {
            const nextInputOffset = Math.round((offsetResult + 1) * ratio);
            let accum = 0;
            let count = 0;
            for (
              let i = offsetInput;
              i < nextInputOffset && i < input.length;
              i++
            ) {
              accum += input[i];
              count++;
            }
            const avg = count > 0 ? accum / count : 0;
            downsampled[offsetResult] = Math.max(-1, Math.min(1, avg)) * 0x7fff;
            offsetResult++;
            offsetInput = nextInputOffset;
          }

          let binary = "";
          const bytes = new Uint8Array(downsampled.buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          wsRef.current.send(JSON.stringify({ type: "audio", data: base64 }));
        };
        micSource.connect(processor);
        processor.connect(ctx.destination); // Required to trigger onaudioprocess
        processorRef.current = processor;
        processorConnectedRef.current = true;

        // 2. Connect WebSocket to backend
        const wsUrl = getWsUrl(
          optionsRef.current.systemPrompt,
          optionsRef.current.voiceName || "Kore",
        );
        console.log("[GeminiLive] Connecting to backend WebSocket…");

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(
            "[GeminiLive] WebSocket connection to backend opened. Sending setup…",
          );
          const setupMsg = {
            type: "setup",
            systemPrompt: optionsRef.current.systemPrompt,
            voiceName: optionsRef.current.voiceName || "Kore",
          };
          ws.send(JSON.stringify(setupMsg));
        };

        ws.onmessage = (e) => {
          console.log(
            "[GeminiLive] Received raw message from backend:",
            e.data.length,
            "bytes",
          );
          handleServerMessage(e);
        };

        ws.onclose = (e) => {
          console.log(
            `[GeminiLive] WebSocket closed: code=${e.code} reason=${e.reason}`,
          );
          isConnectedRef.current = false;
          setIsConnected(false);
          setIsConnecting(false);
          setIsReconnecting(false);
          optionsRef.current.onConnectionChange?.(false);

          if (isIntentionalDisconnectRef.current) {
            return;
          }

          // Attempt reconnection if not a normal closure and haven't exceeded max attempts
          const isNormalClosure = e.code === 1000 || e.code === 1001;
          if (
            !isNormalClosure &&
            reconnectAttemptsRef.current < maxReconnectAttempts
          ) {
            const attempt = reconnectAttemptsRef.current + 1;
            const delay = Math.min(
              baseReconnectDelay * Math.pow(2, attempt - 1),
              30000,
            );
            console.log(
              `[GeminiLive] Attempting reconnection ${attempt}/${maxReconnectAttempts} in ${delay}ms`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current = attempt;
              connect(true).catch((err) => {
                console.error("[GeminiLive] Reconnection failed:", err);
                setConnectionError("Failed to reconnect to server");
                setIsReconnecting(false);
              });
            }, delay);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setConnectionError(
              "Maximum reconnection attempts reached. Please try again.",
            );
          }
        };

        ws.onerror = (err) => {
          console.error("[GeminiLive] WebSocket error:", err);
          optionsRef.current.onError?.("Connection to server failed.");
        };
      } catch (err) {
        console.error("[GeminiLive] Connection error:", err);
        setIsConnecting(false);
        setIsReconnecting(false);
        setConnectionError(
          err instanceof Error ? err.message : "Failed to connect to AI",
        );
        optionsRef.current.onError?.(
          err instanceof Error ? err.message : "Failed to connect to AI",
        );
      }
    },
    [handleServerMessage, cleanupAudioResources],
  );

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    // Cancel any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setIsReconnecting(false);

    wsRef.current?.close();
    wsRef.current = null;

    cleanupAudioResources();

    isConnectedRef.current = false;
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    optionsRef.current.onConnectionChange?.(false);
  }, [cleanupAudioResources]);

  // --- Recording Control ---
  const startRecording = useCallback(() => {
    if (!mixerRef.current) return;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(mixerRef.current.stream, {
      mimeType: "audio/webm",
    });
    recorder.ondataavailable = (e) =>
      e.data.size > 0 && recordedChunksRef.current.push(e.data);
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(async () => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") return resolve(null);
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "audio/webm",
        });
        recordedChunksRef.current = [];
        resolve(blob);
      };
      recorder.stop();
      setIsRecording(false);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
      cleanupAudioResources();
    };
  }, [cleanupAudioResources]);

  return {
    isConnected,
    isConnecting,
    isReconnecting,
    connectionError,
    transcript,
    insights,
    objections,
    moods,
    personaLeft,
    connect,
    disconnect,
    sendText: (text: string) => {
      addTranscriptEntry("user", text);
      wsRef.current?.send(JSON.stringify({ type: "text", text }));
    },
    logManualInsight: () =>
      wsRef.current?.send(JSON.stringify({ type: "log_insight" })),
    getDuration: () =>
      startTimeRef.current
        ? Math.round((Date.now() - startTimeRef.current) / 1000)
        : 0,
    isMuted,
    toggleMic: () => {
      const nextMuted = !isMutedRef.current;
      isMutedRef.current = nextMuted;
      setIsMuted(nextMuted);

      // Properly disconnect/reconnect processor to ensure no audio is sent when muted
      if (processorRef.current && micSourceRef.current && audioCtxRef.current) {
        try {
          if (nextMuted) {
            micSourceRef.current.disconnect();
            processorConnectedRef.current = false;
          } else {
            micSourceRef.current.connect(processorRef.current);
            processorConnectedRef.current = true;
          }
        } catch (err) {
          console.error("[GeminiLive] Error toggling mic:", err);
        }
      }
    },
    isRecording,
    isAISpeaking,
    startRecording,
    stopRecording,
    getRecordingBlob: () =>
      recordedChunksRef.current.length
        ? new Blob(recordedChunksRef.current, { type: "audio/webm" })
        : null,
    waitForPlaybackFinish: async () => {
      while (isPlayingRef.current || audioQueueRef.current.length > 0) {
        await new Promise((r) => setTimeout(r, 100));
      }
    },
  };
}
