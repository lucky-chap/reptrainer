"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CALL_WARNING_THRESHOLD_SECONDS,
  CALL_DURATION_DEFAULT,
} from "@reptrainer/shared";

export interface UseCallTimerOptions {
  /** Duration in minutes */
  durationMinutes: number;
  /** Called when the warning threshold is reached (45s left) */
  onWarning?: () => void;
  /** Called when time runs out */
  onTimeUp?: () => void;
}

export interface UseCallTimerReturn {
  /** Total elapsed seconds */
  elapsed: number;
  /** Total remaining seconds */
  remaining: number;
  /** Whether the timer is running */
  isRunning: boolean;
  /** Whether the warning has been triggered */
  warningTriggered: boolean;
  /** Whether the time is up */
  isTimeUp: boolean;
  /** The start time as ISO string (for persistence) */
  startTime: string | null;
  /** Start the timer */
  start: () => void;
  /** Stop the timer */
  stop: () => void;
  /** Resume from a persisted startTime */
  resumeFrom: (startTimeIso: string) => void;
  /** Formatted remaining time (MM:SS) */
  formattedRemaining: string;
  /** Formatted elapsed time (MM:SS) */
  formattedElapsed: string;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Hook for managing timed sales calls.
 *
 * Timer state is derived from timestamps (Date.now() - startTime),
 * NOT from in-memory intervals. This means:
 * - Timer continues accurately even if the user refreshes the page
 * - No desync from setInterval drift
 * - Persistence-safe: stores startTime in Firestore, recomputes on load
 */
export function useCallTimer({
  durationMinutes,
  onWarning,
  onTimeUp,
}: UseCallTimerOptions): UseCallTimerReturn {
  const totalSeconds = durationMinutes * 60;

  const [startTime, setStartTime] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [warningTriggered, setWarningTriggered] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onWarningRef = useRef(onWarning);
  const onTimeUpRef = useRef(onTimeUp);

  // Keep refs up to date
  useEffect(() => {
    onWarningRef.current = onWarning;
    onTimeUpRef.current = onTimeUp;
  }, [onWarning, onTimeUp]);

  const isRunning = startTime !== null && !isTimeUp;
  const remaining = Math.max(0, totalSeconds - elapsed);

  const tick = useCallback(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    const now = Date.now();
    const elapsedSecs = Math.floor((now - start) / 1000);

    setElapsed(elapsedSecs);

    const remainingSecs = totalSeconds - elapsedSecs;

    // Warning at threshold
    if (
      remainingSecs <= CALL_WARNING_THRESHOLD_SECONDS &&
      remainingSecs > 0 &&
      !warningTriggered
    ) {
      setWarningTriggered(true);
      onWarningRef.current?.();
    }

    // Time is up
    if (remainingSecs <= 0) {
      setIsTimeUp(true);
      onTimeUpRef.current?.();
    }
  }, [startTime, totalSeconds, warningTriggered]);

  // Poll every second (deriving from timestamp, not counting)
  useEffect(() => {
    if (startTime && !isTimeUp) {
      // Immediately tick once
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime, isTimeUp, tick]);

  const start = useCallback(() => {
    const now = new Date().toISOString();
    setStartTime(now);
    setElapsed(0);
    setWarningTriggered(false);
    setIsTimeUp(false);
  }, []);

  const stop = useCallback(() => {
    setStartTime(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resumeFrom = useCallback((startTimeIso: string) => {
    setStartTime(startTimeIso);
    setWarningTriggered(false);
    setIsTimeUp(false);
  }, []);

  return {
    elapsed,
    remaining,
    isRunning,
    warningTriggered,
    isTimeUp,
    startTime,
    start,
    stop,
    resumeFrom,
    formattedRemaining: formatTime(remaining),
    formattedElapsed: formatTime(elapsed),
  };
}
