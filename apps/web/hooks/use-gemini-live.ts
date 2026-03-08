"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useGeminiAudio } from "./use-gemini-audio";
import { useGeminiSocket } from "./use-gemini-socket";
import { TranscriptEntry, SalesInsight } from "./gemini-types";
import { fetchAuthToken } from "@/app/actions/api";

export interface UseGeminiLiveOptions {
  systemPrompt: string;
  voiceName?: string;
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  onPersonaLeft?: () => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions) {
  const [personaLeft, setPersonaLeft] = useState(false);

  // Init pure modules
  const audio = useGeminiAudio({
    onPersonaLeft: () => {
      setPersonaLeft(true);
      options.onPersonaLeft?.();
    },
    onAudioData: (base64) => {
      socket.sendAudioData(base64);
    },
  });

  const socket = useGeminiSocket({
    systemPrompt: options.systemPrompt,
    voiceName: options.voiceName,
    onTranscriptUpdate: options.onTranscriptUpdate,
    onConnectionChange: options.onConnectionChange,
    onError: options.onError,
    onSetupComplete: () => {
      audio.playSoundEffect("stop");
      audio.playSoundEffect("success");
    },
    onAudioData: (base64) => {
      audio.receiveAudioChunk(base64);
    },
    onToolCallEndRoleplay: () => {
      audio.markPendingPersonaLeft();
    },
  });

  const connect = useCallback(async () => {
    try {
      setPersonaLeft(false);

      audio.playSoundEffect("connecting");
      socket.resetState();

      const tokenData = await fetchAuthToken(
        options.systemPrompt,
        options.voiceName || "Kore",
      );
      if (!tokenData.token || !tokenData.project) {
        throw new Error("Failed to get authentication data from backend.");
      }

      await audio.initializeAudio();

      await socket.connectSocket(
        tokenData.token,
        tokenData.project,
        tokenData.location,
        tokenData.setupConfig,
      );
    } catch (error) {
      console.error("[VertexAI] Connection error:", error);
      socket.setIsConnecting(false);
      audio.cleanup();
      options.onError?.(
        error instanceof Error ? error.message : "Failed to connect",
      );
    }
  }, [audio, socket, options]);

  const disconnect = useCallback(() => {
    socket.disconnectSocket();
    audio.cleanup();
  }, [socket, audio]);

  return {
    isConnected: socket.isConnected,
    isConnecting: socket.isConnecting,
    transcript: socket.transcript,
    insights: socket.insights,
    personaLeft,
    connect,
    disconnect,
    sendText: socket.sendText,
    logManualInsight: socket.logManualInsight,
    getDuration: socket.getDuration,
    isRecording: audio.isRecording,
    isAISpeaking: audio.isAISpeaking,
    startRecording: audio.startRecording,
    stopRecording: audio.stopRecording,
    getRecordingBlob: audio.getRecordingBlob,
  };
}
