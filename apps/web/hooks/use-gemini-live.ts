"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  TranscriptEntry,
  SalesInsight,
  ObjectionLog,
  PersonaMood,
} from "./gemini-types";
import env from "@/config/env";

export interface UseGeminiLiveOptions {
  systemPrompt: string;
  persona?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  scenario?: Record<string, unknown>;
  userName?: string;
  companyName?: string;
  voiceName?: string;
  teamId?: string;
  sessionId?: string;
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  onPersonaLeft?: () => void;
}

// Build the WebSocket URL pointing to the Python ADK live-agent service
function getWsUrl(
  voiceName: string,
  sessionId?: string,
  teamId?: string,
): string {
  const wsBaseUrl = env.NEXT_PUBLIC_LIVE_AGENT_URL || "ws://localhost:5000";
  const secretKey = env.NEXT_PUBLIC_API_SECRET_KEY;
  const sid = sessionId || crypto.randomUUID();
  const base = wsBaseUrl.endsWith("/") ? wsBaseUrl.slice(0, -1) : wsBaseUrl;

  const params = new URLSearchParams({
    apiKey: secretKey,
    voiceName: voiceName,
  });

  if (teamId) params.append("teamId", teamId);

  // Python FastAPI expects @app.websocket("/ws/{session_id}")
  return `${base}/ws/${sid}?${params.toString()}`;
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
  const [isModelThinking, setIsModelThinking] = useState(false);
  const [streamingModelText, setStreamingModelText] = useState("");
  const [isPersonaResearching, setIsPersonaResearching] = useState(false);
  const [researchTopic, setResearchTopic] = useState("");

  // --- Refs ---
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // --- Audio Refs ---
  const wsRef = useRef<WebSocket | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const recorderNodeRef = useRef<AudioWorkletNode | null>(null);
  const playerNodeRef = useRef<AudioWorkletNode | null>(null);
  const vadNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mixerRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const isConnectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const suppressVadUntilRef = useRef(0);
  // Tracks whether we actually sent activity_start to Gemini so we only send
  // activity_end when there is a matching start (prevents orphan end signals).
  const vadActivitySentRef = useRef(false);

  // --- Reconnection State ---
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectInFlightRef = useRef(false);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;
  const isIntentionalDisconnectRef = useRef(false);
  const connectRef = useRef<
    ((isReconnect?: boolean) => Promise<void>) | undefined
  >(undefined);

  const pushTranscript = useCallback(
    (role: "user" | "model", text: string, finished: boolean) => {
      if (!text) return;
      const timestamp = Math.round(
        (Date.now() - (startTimeRef.current ?? 0)) / 1000,
      );

      // Special handling for model: only push to history when finished
      // We'll manage the "streaming" state via streamingModelText for the UI
      if (role === "model") {
        if (!finished) {
          setIsModelThinking(true);
          setStreamingModelText(text);
          return;
        } else {
          setIsModelThinking(false);
          setStreamingModelText("");
          // Fall through to push the final text
        }
      }

      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role && last.isStreaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              text,
              timestamp,
              isStreaming: !finished,
            },
          ];
        }
        // Deduplicate: skip if the last finished entry has the same role+text
        if (
          last &&
          last.role === role &&
          !last.isStreaming &&
          last.text === text
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            role,
            text,
            timestamp,
            isStreaming: !finished,
          },
        ];
      });
    },
    [],
  );

  // --- Handle JSON messages from the Python live-agent service ---
  const handleServerMessage = useCallback(
    (data: string) => {
      try {
        const msg = JSON.parse(data);

        switch (msg.type) {
          case "connected":
            console.log("[GeminiLive] ADK session established");
            isConnectedRef.current = true;
            setIsConnected(true);
            setIsConnecting(false);
            setIsReconnecting(false);
            optionsRef.current.onConnectionChange?.(true);
            break;

          case "turn_complete":
            break;

          case "interrupted":
            console.log("[GeminiLive] Model was interrupted, clearing audio");
            playerNodeRef.current?.port.postMessage({ command: "clear" });
            isPlayingRef.current = false;
            setIsAISpeaking(false);
            break;

          case "tool_call":
            console.log(`[GeminiLive] Tool call: ${msg.name}`, msg.args);
            if (msg.name === "log_sales_insight") {
              setInsights((prev) => [
                ...prev,
                {
                  insight: msg.args.insight,
                  timestamp: Math.round(
                    (Date.now() - (startTimeRef.current ?? 0)) / 1000,
                  ),
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
                  timestamp: Math.round(
                    (Date.now() - (startTimeRef.current ?? 0)) / 1000,
                  ),
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
                  timestamp: Math.round(
                    (Date.now() - (startTimeRef.current ?? 0)) / 1000,
                  ),
                },
              ]);
            }
            if (msg.name === "research_competitor") {
              setIsPersonaResearching(true);
              setResearchTopic(msg.args.competitorName || "");
            }
            if (msg.name === "research_complete") {
              setIsPersonaResearching(false);
              setResearchTopic("");
            }
            if (msg.name === "end_roleplay") {
              // Wait for buffered audio to drain before signaling end
              const waitForAudioDrain = async () => {
                const maxWait = 15000;
                const start = Date.now();
                while (isPlayingRef.current && Date.now() - start < maxWait) {
                  await new Promise((r) => setTimeout(r, 200));
                }
                await new Promise((r) => setTimeout(r, 1000));
                setPersonaLeft(true);
                optionsRef.current.onPersonaLeft?.();
              };
              waitForAudioDrain();
            }
            break;

          case "input_transcription":
            pushTranscript("user", msg.text || "", Boolean(msg.isFinal));
            break;

          case "output_transcription":
            pushTranscript("model", msg.text || "", Boolean(msg.isFinal));
            break;

          case "transcript":
            if (msg.role === "user" || msg.role === "model") {
              pushTranscript(msg.role, msg.text || "", Boolean(msg.finished));
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
            break;
        }
      } catch (err) {
        console.error("[GeminiLive] Failed to parse server message:", err);
      }
    },
    [pushTranscript],
  );

  // --- Audio Resource Cleanup ---
  const cleanupAudioResources = useCallback(() => {
    recorderNodeRef.current?.disconnect();
    recorderNodeRef.current = null;
    playerNodeRef.current?.disconnect();
    playerNodeRef.current = null;
    vadNodeRef.current?.disconnect();
    vadNodeRef.current = null;
    micSourceRef.current = null;

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (captureCtxRef.current && captureCtxRef.current.state !== "closed") {
      captureCtxRef.current.close().catch(console.error);
      captureCtxRef.current = null;
    }
    if (playbackCtxRef.current && playbackCtxRef.current.state !== "closed") {
      playbackCtxRef.current.close().catch(console.error);
      playbackCtxRef.current = null;
    }

    mixerRef.current = null;
    isPlayingRef.current = false;
  }, []);

  // --- Core Lifecycle: Connect ---
  const connect = useCallback(
    async (isReconnect = false) => {
      if (
        connectInFlightRef.current ||
        (wsRef.current &&
          (wsRef.current.readyState === WebSocket.OPEN ||
            wsRef.current.readyState === WebSocket.CONNECTING))
      ) {
        return;
      }
      connectInFlightRef.current = true;
      isIntentionalDisconnectRef.current = false;

      cleanupAudioResources();

      if (isReconnect) {
        setIsReconnecting(true);
        setConnectionError(null);
        vadActivitySentRef.current = false;
      } else {
        setIsConnecting(true);
        setIsConnected(false);
        setConnectionError(null);
        setPersonaLeft(false);
        setInsights([]);
        setObjections([]);
        setMoods([]);
        setTranscript([]);
        startTimeRef.current = Date.now();
        reconnectAttemptsRef.current = 0;
        vadActivitySentRef.current = false;
      }

      try {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Close any existing WebSocket
        if (wsRef.current) {
          isIntentionalDisconnectRef.current = true;
          wsRef.current.close();
          wsRef.current = null;
        }

        // ── Setup Audio: Capture (16kHz) ──────────────────────────────────
        const captureCtx = new AudioContext({ sampleRate: 16000 });
        captureCtxRef.current = captureCtx;
        await captureCtx.resume();

        await captureCtx.audioWorklet.addModule(
          "/worklets/pcm-recorder-processor.js",
        );
        await captureCtx.audioWorklet.addModule("/worklets/vad-processor.js");

        const mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        micStreamRef.current = mic;
        const micSource = captureCtx.createMediaStreamSource(mic);
        micSourceRef.current = micSource;

        const recorderNode = new AudioWorkletNode(
          captureCtx,
          "pcm-recorder-processor",
        );
        recorderNodeRef.current = recorderNode;
        micSource.connect(recorderNode);

        recorderNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (
            !wsRef.current ||
            wsRef.current.readyState !== WebSocket.OPEN ||
            !isConnectedRef.current ||
            isMutedRef.current ||
            !vadActivitySentRef.current
          )
            return;
          wsRef.current.send(e.data);
        };

        const vadNode = new AudioWorkletNode(captureCtx, "vad-processor");
        vadNodeRef.current = vadNode;
        micSource.connect(vadNode);

        vadNode.port.onmessage = (e: MessageEvent) => {
          if (
            !wsRef.current ||
            wsRef.current.readyState !== WebSocket.OPEN ||
            !isConnectedRef.current ||
            isMutedRef.current
          )
            return;

          const vadEvent = e.data?.event;
          if (Date.now() < suppressVadUntilRef.current) return;

          if (vadEvent === "activity_start") {
            // Remove the isPlayingRef check to allow interruption
            vadActivitySentRef.current = true;
            wsRef.current.send(JSON.stringify(e.data));
          } else if (vadEvent === "activity_end") {
            if (!vadActivitySentRef.current) return;
            vadActivitySentRef.current = false;
            wsRef.current.send(JSON.stringify(e.data));
          }
        };

        // ── Setup Audio: Playback (24kHz) ────────────────────────────────
        const playbackCtx = new AudioContext({ sampleRate: 24000 });
        playbackCtxRef.current = playbackCtx;
        await playbackCtx.resume();
        await playbackCtx.audioWorklet.addModule(
          "/worklets/pcm-player-processor.js",
        );

        const playerNode = new AudioWorkletNode(
          playbackCtx,
          "pcm-player-processor",
        );
        playerNodeRef.current = playerNode;
        playerNode.connect(playbackCtx.destination);

        // Bridge: Capture AI audio for recording
        const aiPlaybackDestination =
          playbackCtx.createMediaStreamDestination();
        playerNode.connect(aiPlaybackDestination);

        playerNode.port.onmessage = (e: MessageEvent) => {
          if (e.data?.type === "drain") {
            isPlayingRef.current = false;
            setIsAISpeaking(false);
          }
        };

        // ── Mixer for recording both sides ────────────────────────────────
        const mixer = captureCtx.createMediaStreamDestination();
        mixerRef.current = mixer;
        micSource.connect(mixer);

        // Connect bridged AI audio to the mixer
        const aiSource = captureCtx.createMediaStreamSource(
          aiPlaybackDestination.stream,
        );
        aiSource.connect(mixer);

        // ── Connect WebSocket to Python ADK live-agent ────────────────────
        const url = getWsUrl(
          optionsRef.current.voiceName || "Kore",
          optionsRef.current.sessionId,
          optionsRef.current.teamId,
        );
        console.log("[GeminiLive] Connecting to ADK live-agent...");

        const ws = new WebSocket(url);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          connectInFlightRef.current = false;
          console.log("[GeminiLive] WebSocket open. Sending setup...");
          const opts = optionsRef.current;
          ws.send(
            JSON.stringify({
              type: "setup",
              persona: opts.persona,
              metadata: opts.metadata,
              scenario: opts.scenario,
              userName: opts.userName,
              companyName: opts.companyName,
              systemPrompt: opts.persona ? undefined : opts.systemPrompt,
              voiceName: opts.voiceName || "Kore",
              sessionId: opts.sessionId,
            }),
          );
        };

        ws.onmessage = (e: MessageEvent) => {
          if (e.data instanceof ArrayBuffer) {
            if (!isConnectedRef.current) return;
            isPlayingRef.current = true;
            setIsAISpeaking(true);
            suppressVadUntilRef.current = Date.now() + 300;
            const buf = e.data as ArrayBuffer;
            playerNodeRef.current?.port.postMessage(buf, [buf]);
          } else {
            handleServerMessage(e.data as string);
          }
        };

        ws.onclose = (e) => {
          connectInFlightRef.current = false;
          console.log(
            `[GeminiLive] WebSocket closed: code=${e.code} reason=${e.reason}`,
          );
          isConnectedRef.current = false;
          setIsConnected(false);
          setIsConnecting(false);
          setIsReconnecting(false);
          optionsRef.current.onConnectionChange?.(false);

          if (isIntentionalDisconnectRef.current) return;

          const isNormalClosure = e.code === 1000 || e.code === 1001;
          const isDuplicateSession = e.code === 4002;

          if (
            !isNormalClosure &&
            !isDuplicateSession &&
            reconnectAttemptsRef.current < maxReconnectAttempts &&
            !connectInFlightRef.current
          ) {
            const attempt = reconnectAttemptsRef.current + 1;
            const delay = Math.min(
              baseReconnectDelay * Math.pow(2, attempt - 1),
              30000,
            );
            console.log(
              `[GeminiLive] Reconnecting ${attempt}/${maxReconnectAttempts} in ${delay}ms`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current = attempt;
              connectRef.current?.(true).catch((err) => {
                console.error("[GeminiLive] Reconnection failed:", err);
                setConnectionError("Failed to reconnect to server");
                setIsReconnecting(false);
              });
            }, delay);
          } else if (isDuplicateSession) {
            setConnectionError(
              "This session is already active in another tab.",
            );
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setConnectionError(
              "Maximum reconnection attempts reached. Please try again.",
            );
          }
        };

        ws.onerror = (err) => {
          connectInFlightRef.current = false;
          console.error("[GeminiLive] WebSocket error:", err);
          optionsRef.current.onError?.("Connection to server failed.");
        };
      } catch (err) {
        console.error("[GeminiLive] Connection error:", err);
        connectInFlightRef.current = false;
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

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    optionsRef.current.onTranscriptUpdate?.(transcript);
  }, [transcript]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
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
      pushTranscript("user", text, true);
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

      if (recorderNodeRef.current && micSourceRef.current) {
        try {
          if (nextMuted) {
            micSourceRef.current.disconnect(recorderNodeRef.current);
          } else {
            micSourceRef.current.connect(recorderNodeRef.current);
          }
        } catch (err) {
          console.error("[GeminiLive] Error toggling mic:", err);
        }
      }
    },
    isRecording,
    isAISpeaking,
    isModelThinking,
    streamingModelText,
    isPersonaResearching,
    researchTopic,
    startRecording,
    stopRecording,
    getRecordingBlob: () =>
      recordedChunksRef.current.length
        ? new Blob(recordedChunksRef.current, { type: "audio/webm" })
        : null,
    waitForPlaybackFinish: async () => {
      const maxWait = 15000;
      const start = Date.now();
      while (isPlayingRef.current && Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, 100));
      }
    },
  };
}
