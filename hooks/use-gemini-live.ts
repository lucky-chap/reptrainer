"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { GoogleGenAI, Modality } from "@google/genai";

export interface TranscriptEntry {
  role: "user" | "model";
  text: string;
  timestamp: number;
}

interface UseGeminiLiveOptions {
  systemPrompt: string;
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

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
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const startTimeRef = useRef<number>(0);
  const isCleanedUpRef = useRef(false);

  // Cleanup all audio resources
  const cleanup = useCallback(() => {
    if (isCleanedUpRef.current) return;
    isCleanedUpRef.current = true;

    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch { /* ignore */ }
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
      sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (micCtxRef.current) {
      try { micCtxRef.current.close(); } catch { /* ignore */ }
      micCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      try { playbackCtxRef.current.close(); } catch { /* ignore */ }
      playbackCtxRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // Convert Float32 PCM to Int16 PCM
  const float32ToInt16 = useCallback((float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }, []);

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
    []
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
      try { await ctx.resume(); } catch { /* ignore */ }
    }

    while (audioQueueRef.current.length > 0) {
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

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;
  }, []);

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    try {
      isCleanedUpRef.current = false;
      setIsConnecting(true);

      // Get API key from server
      const tokenRes = await fetch("/api/auth/token", { method: "POST" });
      const tokenData = await tokenRes.json();

      if (!tokenData.apiKey) {
        throw new Error("Failed to get API key. Make sure GEMINI_API_KEY is set in .env.local");
      }

      const ai = new GoogleGenAI({ apiKey: tokenData.apiKey });

      // Set up playback audio context (24kHz for Gemini output)
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });

      // Request microphone access
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Reset transcript
      transcriptRef.current = [];
      setTranscript([]);
      startTimeRef.current = Date.now();

      const systemPrompt = optionsRef.current.systemPrompt;

      // Connect to Gemini Live API with the correct model
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore",
              },
            },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("[GeminiLive] Connected");
            setIsConnected(true);
            setIsConnecting(false);
            optionsRef.current.onConnectionChange?.(true);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onmessage: (message: any) => {
            const serverContent = message.serverContent as
              | {
                  modelTurn?: {
                    parts?: Array<{
                      inlineData?: { data?: string; mimeType?: string };
                      text?: string;
                    }>;
                  };
                  interrupted?: boolean;
                  turnComplete?: boolean;
                }
              | undefined;

            if (serverContent?.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                // Handle audio data
                if (part.inlineData?.data) {
                  try {
                    const binaryString = atob(part.inlineData.data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                      bytes[i] = binaryString.charCodeAt(i);
                    }
                    audioQueueRef.current.push(bytes.buffer);
                    playAudioQueue();
                  } catch (err) {
                    console.error("[GeminiLive] Audio decode error:", err);
                  }
                }

                // Handle text parts (transcript from model)
                if (part.text) {
                  const entry: TranscriptEntry = {
                    role: "model",
                    text: part.text,
                    timestamp: Date.now() - startTimeRef.current,
                  };
                  transcriptRef.current = [...transcriptRef.current, entry];
                  setTranscript([...transcriptRef.current]);
                  optionsRef.current.onTranscriptUpdate?.([...transcriptRef.current]);
                }
              }
            }

            // Handle interruption — clear audio queue
            if (serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onerror: (e: Error | Event) => {
            const msg = e instanceof Error ? e.message : "WebSocket error";
            console.error("[GeminiLive] Error:", msg, e);
            optionsRef.current.onError?.(msg);
          },
          onclose: (e: CloseEvent | Event) => {
            const reason = (e as CloseEvent)?.reason || "Connection closed";
            const code = (e as CloseEvent)?.code;
            console.log(`[GeminiLive] Closed: code=${code} reason="${reason}"`);
            setIsConnected(false);
            setIsConnecting(false);
            optionsRef.current.onConnectionChange?.(false);
          },
        },
      });

      sessionRef.current = session;

      // Set up microphone streaming via a separate AudioContext
      // Browsers typically capture at 44.1kHz or 48kHz — we downsample to 16kHz
      micCtxRef.current = new AudioContext();
      const micSource = micCtxRef.current.createMediaStreamSource(mediaStreamRef.current);
      const processor = micCtxRef.current.createScriptProcessor(4096, 1, 1);

      micSource.connect(processor);
      processor.connect(micCtxRef.current.destination);

      const actualSampleRate = micCtxRef.current.sampleRate;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current || isCleanedUpRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsample(inputData, actualSampleRate, 16000);
        const int16Data = float32ToInt16(downsampled);

        // Convert to base64
        const uint8Array = new Uint8Array(int16Data.buffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        try {
          session.sendRealtimeInput({
            audio: {
              data: base64,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // Session might be closing — ignore
        }
      };

      sourceRef.current = micSource;
      processorRef.current = processor;

      console.log("[GeminiLive] Mic streaming started at", actualSampleRate, "Hz");
    } catch (error) {
      console.error("[GeminiLive] Connection error:", error);
      setIsConnecting(false);
      setIsConnected(false);
      cleanup();
      optionsRef.current.onError?.(
        error instanceof Error ? error.message : "Failed to connect"
      );
    }
  }, [cleanup, downsample, float32ToInt16, playAudioQueue]);

  // Disconnect
  const disconnect = useCallback(() => {
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
  const sendText = useCallback((text: string) => {
    if (!sessionRef.current) return;

    const entry: TranscriptEntry = {
      role: "user",
      text,
      timestamp: Date.now() - startTimeRef.current,
    };
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript([...transcriptRef.current]);
    optionsRef.current.onTranscriptUpdate?.([...transcriptRef.current]);

    sessionRef.current.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
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
        try { sessionRef.current.close(); } catch { /* */ }
        sessionRef.current = null;
      }
      // Inline cleanup to avoid stale ref issues
      if (processorRef.current) {
        try { processorRef.current.disconnect(); } catch { /* */ }
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch { /* */ }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (micCtxRef.current) {
        try { micCtxRef.current.close(); } catch { /* */ }
      }
      if (playbackCtxRef.current) {
        try { playbackCtxRef.current.close(); } catch { /* */ }
      }
    };
  }, []); // Empty deps — only runs on unmount

  return {
    isConnected,
    isConnecting,
    transcript,
    connect,
    disconnect,
    sendText,
    getDuration,
  };
}
