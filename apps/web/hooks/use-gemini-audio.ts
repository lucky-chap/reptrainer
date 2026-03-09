"use client";

import { useCallback, useRef, useState, useEffect } from "react";

export interface UseGeminiAudioOptions {
  onPersonaLeft?: () => void;
  onAudioData?: (base64: string) => void;
}

export function useGeminiAudio(options: UseGeminiAudioOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const playbackCtxRef = useRef<AudioContext | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const connectingOscRef = useRef<OscillatorNode | null>(null);
  const connectingGainRef = useRef<GainNode | null>(null);
  const isCleanedUpRef = useRef(false);

  const pendingPersonaLeftRef = useRef(false);
  const personaLeftRef = useRef(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mixedStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(
    null,
  );

  // Connection sound effects
  const playSoundEffect = useCallback(
    async (type: "connecting" | "success" | "stop") => {
      const ctx = playbackCtxRef.current;
      if (!ctx || ctx.state === "closed") return;

      // Always try to resume context (handles autoplay policies)
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch (e) {
          console.warn("[Audio] Failed to resume context for sound effect");
        }
      }

      if (type === "stop") {
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
        return;
      }

      if (type === "connecting") {
        // Prevent multiple connecting sounds
        if (connectingOscRef.current) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);

        // Continuous pulse effect using a recurring ramp
        gain.gain.setValueAtTime(0, ctx.currentTime);

        const pulse = () => {
          if (!connectingOscRef.current || isCleanedUpRef.current) return;
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.linearRampToValueAtTime(0.04, now + 0.1);
          gain.gain.linearRampToValueAtTime(0, now + 0.8);
          // Recursively schedule instead of a massive loop
          setTimeout(pulse, 1200);
        };

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        connectingOscRef.current = osc;
        connectingGainRef.current = gain;
        pulse();
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

    // Recording cleanup — stop recorder but do NOT clear recorded chunks
    // so that stopRecording() / getRecordingBlob() can still read them.
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    mixedStreamDestRef.current = null;
    setIsRecording(false);

    // Stop and disconnect all tones
    playSoundEffect("stop");
  }, [playSoundEffect]);
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
  const triggerPersonaLeft = useCallback(() => {
    if (personaLeftRef.current) return;

    console.log("[GeminiLive] AI is leaving the call (playback finished)");
    personaLeftRef.current = true;

    optionsRef.current.onPersonaLeft?.();

    // Stop sending mic audio
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const markPendingPersonaLeft = useCallback(() => {
    pendingPersonaLeftRef.current = true;
    if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
      triggerPersonaLeft();
    }
  }, [triggerPersonaLeft]);

  const waitForPlaybackFinish = useCallback(async () => {
    if (!isPlayingRef.current && audioQueueRef.current.length === 0) return;

    return new Promise<void>((resolve) => {
      const check = () => {
        if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }, []);

  // Play audio from the queue
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      // If we are already finishing up and the queue is empty, check for pending termination
      if (
        !isPlayingRef.current &&
        audioQueueRef.current.length === 0 &&
        pendingPersonaLeftRef.current
      ) {
        triggerPersonaLeft();
      }
      return;
    }

    isPlayingRef.current = true;
    setIsAISpeaking(true);

    const ctx = playbackCtxRef.current;
    if (!ctx || ctx.state === "closed") {
      isPlayingRef.current = false;
      setIsAISpeaking(false);
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
    setIsAISpeaking(false);

    // If the persona decided to leave while speaking, trigger it now that audio finished
    if (pendingPersonaLeftRef.current && !isCleanedUpRef.current) {
      triggerPersonaLeft();
    }
  }, [triggerPersonaLeft]);
  const startRecording = useCallback(() => {
    if (!mixedStreamDestRef.current) return;

    // Try a few progressive formats so recording works cross-browser (e.g. Safari supports mp4, Chrome supports webm)
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mp3",
      "audio/aac",
      "audio/ogg",
      "", // Fallback to browser default
    ];

    let options = {};
    for (const mimeType of mimeTypes) {
      if (mimeType === "" || MediaRecorder.isTypeSupported(mimeType)) {
        if (mimeType !== "") options = { mimeType };
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(
        mixedStreamDestRef.current.stream,
        options,
      );

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
  // Stop recording and return the audio Blob.
  // Must be called BEFORE disconnect/cleanup so the MediaRecorder can
  // flush its final data via the ondataavailable event.
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        // Recorder already stopped — return whatever chunks we have
        if (recordedChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(recordedChunksRef.current, {
          type: "audio/webm",
        });
        recordedChunksRef.current = [];
        resolve(blob);
        return;
      }

      // Listen for the final onstop event which fires after the last ondataavailable
      recorder.onstop = () => {
        console.log("[Recorder] Session recording stopped, building blob");
        if (recordedChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
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
  const getRecordingBlob = useCallback(() => {
    if (recordedChunksRef.current.length === 0) return null;
    const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    recordedChunksRef.current = [];
    return blob;
  }, []);

  const initializeAudio = useCallback(async () => {
    isCleanedUpRef.current = false;
    personaLeftRef.current = false;
    pendingPersonaLeftRef.current = false;
    setIsAISpeaking(false);

    const playbackCtx = new AudioContext({ sampleRate: 24000 });
    playbackCtxRef.current = playbackCtx;

    const mixer = playbackCtx.createMediaStreamDestination();
    mixedStreamDestRef.current = mixer;

    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mediaStreamRef.current = micStream;

    const mixerMicSource = playbackCtx.createMediaStreamSource(micStream);
    mixerMicSource.connect(mixer);

    micCtxRef.current = new AudioContext();
    const micSource = micCtxRef.current.createMediaStreamSource(micStream);
    const processor = micCtxRef.current.createScriptProcessor(1024, 1, 1);

    micSource.connect(processor);
    processor.connect(micCtxRef.current.destination);

    const actualSampleRate = micCtxRef.current.sampleRate;

    processor.onaudioprocess = (e) => {
      if (isCleanedUpRef.current || personaLeftRef.current) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const downsampled = downsample(inputData, actualSampleRate, 16000);
      const int16Data = float32ToInt16(downsampled);

      const uint8Array = new Uint8Array(int16Data.buffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = window.btoa(binary);

      optionsRef.current.onAudioData?.(base64);
    };

    sourceRef.current = micSource;
    processorRef.current = processor;
  }, [downsample, float32ToInt16]);

  const receiveAudioChunk = useCallback(
    (base64: string) => {
      if (personaLeftRef.current) return;
      try {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioQueueRef.current.push(bytes.buffer);
        playAudioQueue();
      } catch (err) {
        console.error("[VertexAI] Audio decode error:", err);
      }
    },
    [playAudioQueue],
  );
  // Cleanup on unmount only (stable dependency — no callback refs)
  useEffect(() => {
    return () => {
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
    isRecording,
    isAISpeaking,
    playSoundEffect,
    cleanup,
    triggerPersonaLeft,
    markPendingPersonaLeft,
    startRecording,
    stopRecording,
    getRecordingBlob,
    initializeAudio,
    receiveAudioChunk,
    waitForPlaybackFinish,
    audioQueueRef,
    isPlayingRef,
    currentSourceRef,
    transcriptRef: null, // To be used if socket needs anything?
  };
}
