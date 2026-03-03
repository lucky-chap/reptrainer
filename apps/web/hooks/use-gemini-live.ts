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
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const startTimeRef = useRef<number>(0);
  const isCleanedUpRef = useRef(false);
  const personaLeftRef = useRef(false);

  // Buffer for incremental transcription text
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
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

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

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    try {
      isCleanedUpRef.current = false;
      setIsConnecting(true);
      setPersonaLeft(false);
      personaLeftRef.current = false;

      // Get access token from Node.js backend
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const tokenRes = await fetch(`${baseUrl}/api/auth/token`, {
        method: "POST",
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.apiKey) {
        throw new Error("Failed to get access token from backend.");
      }

      // For Vertex AI, we'll use a direct WebSocket connection to the Vertex AI Live endpoint
      // as the @google/genai web SDK is primarily built for Google AI Studio (API Keys).
      // However, we can use the same message protocol.
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
      inputTranscriptBufferRef.current = "";
      outputTranscriptBufferRef.current = "";

      const systemPrompt = optionsRef.current.systemPrompt;
      const voiceName = optionsRef.current.voiceName || "Kore";

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
                voiceName,
              },
            },
          },
          // Enable transcription for both input (user) and output (model)
          inputAudioTranscription: {},
          outputAudioTranscription: {},
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
                  inputTranscription?: { text?: string; finished?: boolean };
                  outputTranscription?: { text?: string; finished?: boolean };
                }
              | undefined;

            if (serverContent?.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                // Handle audio data — skip if persona already left
                if (part.inlineData?.data && !personaLeftRef.current) {
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

                // Fallback: capture text parts from model turn
                // (works even if transcription API isn't supported by the model)
                if (part.text) {
                  addTranscriptEntry("model", part.text);
                }
              }
            }

            // Handle input transcription (what the user said)
            // Check both serverContent level and top-level message
            const inputTx =
              serverContent?.inputTranscription || message.inputTranscription;
            if (inputTx?.text) {
              inputTranscriptBufferRef.current += inputTx.text;
              if (inputTx.finished) {
                addTranscriptEntry("user", inputTranscriptBufferRef.current);
                inputTranscriptBufferRef.current = "";
              }
            }

            // Handle output transcription (what the AI said)
            // Only use if we didn't already capture via part.text above
            const outputTx =
              serverContent?.outputTranscription || message.outputTranscription;
            if (outputTx?.text) {
              outputTranscriptBufferRef.current += outputTx.text;
              if (outputTx.finished) {
                // Only add if we have substantial text not already captured
                const buffered = outputTranscriptBufferRef.current.trim();
                if (buffered) {
                  // Check if this duplicates the last model entry
                  const lastEntry =
                    transcriptRef.current[transcriptRef.current.length - 1];
                  if (
                    !lastEntry ||
                    lastEntry.role !== "model" ||
                    lastEntry.text !== buffered
                  ) {
                    addTranscriptEntry("model", buffered);
                  }
                }
                outputTranscriptBufferRef.current = "";
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

            // Flush any remaining buffered transcriptions
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
          },
        },
      });

      sessionRef.current = session;

      // Set up microphone streaming via a separate AudioContext
      // Browsers typically capture at 44.1kHz or 48kHz — we downsample to 16kHz
      micCtxRef.current = new AudioContext();
      const micSource = micCtxRef.current.createMediaStreamSource(
        mediaStreamRef.current,
      );
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

      console.log(
        "[GeminiLive] Mic streaming started at",
        actualSampleRate,
        "Hz",
      );
    } catch (error) {
      console.error("[GeminiLive] Connection error:", error);
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
        turnComplete: true,
      });
    },
    [addTranscriptEntry],
  );

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
    personaLeft,
    connect,
    disconnect,
    sendText,
    getDuration,
  };
}
