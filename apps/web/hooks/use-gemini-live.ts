"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { TranscriptEntry, SalesInsight } from "./gemini-types";

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const secretKey =
    process.env.NEXT_PUBLIC_API_SECRET_KEY || "reptrainer-secret-123";

  // Swap http(s) → ws(s)
  const wsBase = apiUrl.replace(/^http/, "ws");

  const params = new URLSearchParams({
    apiKey: secretKey,
    systemPrompt,
    voiceName,
  });

  return `${wsBase}/api/live?${params.toString()}`;
}

export function useGeminiLive(options: UseGeminiLiveOptions) {
  // --- State ---
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [personaLeft, setPersonaLeft] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [insights, setInsights] = useState<SalesInsight[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // --- Refs ---
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const wsRef = useRef<WebSocket | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mixerRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const isConnectedRef = useRef(false);
  const isMutedRef = useRef(false);

  // --- Helper: Transcript Management ---
  const addTranscriptEntry = useCallback(
    (role: "user" | "model", text: string, isStreaming: boolean = false) => {
      if (!text) return;
      const now = Date.now();
      const elapsed = startTimeRef.current ? now - startTimeRef.current : 0;

      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        const MERGE_WINDOW = 5000;

        if (
          last &&
          last.role === role &&
          (last.isStreaming ||
            now - (last.timestamp + startTimeRef.current) < MERGE_WINDOW)
        ) {
          const updated = {
            ...last,
            text: isStreaming ? last.text + text : text,
            isStreaming,
          };
          const next = [...prev.slice(0, -1), updated];
          optionsRef.current.onTranscriptUpdate?.(next);
          return next;
        }

        const nextEntry: TranscriptEntry = {
          role,
          text,
          timestamp: elapsed,
          isStreaming,
        };
        const next = [...prev, nextEntry];
        optionsRef.current.onTranscriptUpdate?.(next);
        return next;
      });
    },
    [],
  );

  // --- Audio: Playback Queue ---
  const playAudioQueue = useCallback(async () => {
    if (
      isPlayingRef.current ||
      audioQueueRef.current.length === 0 ||
      !audioCtxRef.current
    ) {
      if (!audioCtxRef.current)
        console.warn("[GeminiLive] playAudioQueue: No AudioContext!");
      return;
    }
    isPlayingRef.current = true;
    setIsAISpeaking(true);
    console.log(
      `[GeminiLive] Playing audio queue: ${audioQueueRef.current.length} chunks, ctx.state=${audioCtxRef.current.state}`,
    );

    const ctx = audioCtxRef.current;
    while (audioQueueRef.current.length > 0) {
      const pcmData = audioQueueRef.current.shift()!;
      if (pcmData.byteLength === 0) continue;

      const int16 = new Int16Array(pcmData);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      if (mixerRef.current) source.connect(mixerRef.current);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;
    setIsAISpeaking(false);
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
            console.log(
              `[GeminiLive] Received audio chunk: dataLen=${msg.data?.length}, type=${typeof msg.data}`,
            );
            const bin = atob(msg.data);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            audioQueueRef.current.push(bytes.buffer);
            console.log(
              `[GeminiLive] Audio queue size: ${audioQueueRef.current.length}, audioCtx: ${!!audioCtxRef.current}, isPlaying: ${isPlayingRef.current}`,
            );
            playAudioQueue();
            break;
          }

          case "turn_complete":
            // Turn is complete — no extra handling needed
            break;

          case "input_transcription":
            addTranscriptEntry("user", msg.text, !msg.isFinal);
            break;

          case "output_transcription":
            addTranscriptEntry("model", msg.text, !msg.isFinal);
            break;

          case "tool_call":
            if (msg.name === "log_sales_insight") {
              setInsights((prev) => [
                ...prev,
                {
                  insight: msg.args.insight,
                  timestamp: Date.now() - startTimeRef.current,
                },
              ]);
            }
            if (msg.name === "end_roleplay") {
              setPersonaLeft(true);
              optionsRef.current.onPersonaLeft?.();
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

  // --- Core Lifecycle: Connect / Disconnect ---
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setPersonaLeft(false);
      setTranscript([]);
      setInsights([]);
      startTimeRef.current = Date.now();
      audioQueueRef.current = [];

      // 1. Setup Audio
      const ctx = new AudioContext({ sampleRate: 24000 });
      await ctx.resume();
      audioCtxRef.current = ctx;
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
      micSource.connect(mixer);

      const processor = ctx.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || !isConnectedRef.current || isMutedRef.current)
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

      // 2. Connect WebSocket to backend
      const wsUrl = getWsUrl(
        optionsRef.current.systemPrompt,
        optionsRef.current.voiceName || "Kore",
      );
      console.log("[GeminiLive] Connecting to backend WebSocket…");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[GeminiLive] WebSocket connection to backend opened.");
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
        optionsRef.current.onConnectionChange?.(false);
      };

      ws.onerror = (err) => {
        console.error("[GeminiLive] WebSocket error:", err);
        optionsRef.current.onError?.("Connection to server failed.");
      };
    } catch (err) {
      console.error("[GeminiLive] Connection error:", err);
      setIsConnecting(false);
      optionsRef.current.onError?.(
        err instanceof Error ? err.message : "Failed to connect to AI",
      );
    }
  }, [handleServerMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    processorRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(console.error);
    }

    isConnectedRef.current = false;
    setIsConnected(false);
    setIsConnecting(false);
    optionsRef.current.onConnectionChange?.(false);
  }, []);

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
      wsRef.current?.close();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    transcript,
    insights,
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
