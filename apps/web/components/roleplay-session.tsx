"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, UserX, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NameInputStage } from "./roleplay/stages/name-input-stage";
import { DurationSelectorStage } from "./roleplay/stages/duration-selector-stage";
import { EvaluatingStage } from "./roleplay/stages/evaluating-stage";
import { CallHeader } from "./roleplay/ui/call-header";
import { CallControls } from "./roleplay/ui/call-controls";
import { CallSidebar } from "./roleplay/ui/call-sidebar";
import { TranscriptArea } from "./roleplay/ui/transcript-area";
import { PersonaCallCard } from "./roleplay/ui/persona-call-card";
import { v4 as uuidv4 } from "uuid";
import { useGeminiLive } from "@/hooks/use-gemini-live";
import { useCallTimer } from "@/hooks/use-call-timer";
import type { Persona, KnowledgeMetadata } from "@/lib/db";
import {
  uploadSessionAudio,
  updateCallSession,
  createCallSession,
} from "@/lib/db";
import { evaluateSession as evaluateSessionAction } from "@/app/actions/api";
import { useAuth } from "@/context/auth-context";
import { env } from "@/config/env";
import { updateUserMetrics } from "@/lib/progress-service";
import {
  CALL_DURATION_DEFAULT,
  CALL_WARNING_THRESHOLD_SECONDS,
  TRAINING_TRACKS,
  type TrainingTrackId,
  type FeedbackReport,
  type ScenarioTemplate,
  PersonaEngine,
  type CallSession,
  type Persona as SharedPersona,
  type KnowledgeMetadata as SharedKnowledgeMetadata,
  FEMALE_VOICES,
  MALE_VOICES,
} from "@reptrainer/shared";

interface RoleplaySessionProps {
  persona: Persona;
  knowledgeMetadata?: KnowledgeMetadata;
  onBack: () => void;
  trackId?: TrainingTrackId;
  scenarioId?: string;
  customScenario?: ScenarioTemplate;
  teamId?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RoleplaySession({
  persona,
  knowledgeMetadata,
  onBack,
  trackId,
  scenarioId,
  customScenario,
  teamId,
}: RoleplaySessionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [evaluating, setEvaluating] = useState(false);
  const [loadingStage, setLoadingStage] = useState<
    "audio" | "evaluating" | "saving" | "finalizing"
  >("audio");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionUserName, setSessionUserName] = useState(
    user?.displayName || "",
  );
  const [nameSubmitted, setNameSubmitted] = useState(!!user);
  const [isCallFinished, setIsCallFinished] = useState(false);

  // ─── Timed Call State ─────────────────────────────────────────────────
  const [durationSelected, setDurationSelected] = useState(false);
  const [callDurationMinutes, setCallDurationMinutes] = useState(
    CALL_DURATION_DEFAULT,
  );
  const [callSessionId] = useState(() => uuidv4());
  const [inputLocked, setInputLocked] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  // ─── Training Track Context ───────────────────────────────────────────
  const track = trackId ? TRAINING_TRACKS.find((t) => t.id === trackId) : null;
  const scenario = customScenario
    ? customScenario
    : track && scenarioId
      ? track.scenarios.find((s) => s.id === scenarioId)
      : null;

  const displayName = sessionUserName.trim() || "Sales Rep";

  // Build system prompt as fallback (Python PersonaEngine is primary)
  const systemPrompt = useMemo(() => {
    return PersonaEngine.generatePrompt(
      persona as unknown as SharedPersona,
      knowledgeMetadata as unknown as SharedKnowledgeMetadata,
      {
        scenario: scenario || undefined,
        userName: sessionUserName.trim() || undefined,
        companyName: knowledgeMetadata?.productCategory || undefined,
      },
    );
  }, [persona, knowledgeMetadata, scenario, sessionUserName]);

  // Map persona gender to a matching Gemini voice
  const femaleVoices = [...FEMALE_VOICES];
  const maleVoices = [...MALE_VOICES];

  const getVoiceForPersona = useCallback(() => {
    // If a specific voice was assigned during generation, use it
    if (persona.voiceName) {
      console.log(
        `[RoleplaySession] Using assigned voice: ${persona.voiceName}`,
      );
      return persona.voiceName;
    }

    const gender = persona.gender || "female";
    const voices = gender === "male" ? maleVoices : femaleVoices;
    // Pick a consistent voice per persona (based on name hash)
    const hash = persona.name
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const selectedVoice = voices[hash % voices.length];
    console.log(`[RoleplaySession] Using fallback voice: ${selectedVoice}`);
    return selectedVoice;
  }, [
    persona.gender,
    persona.name,
    persona.voiceName,
    femaleVoices,
    maleVoices,
  ]);

  const voiceName = getVoiceForPersona();

  const handleTranscriptUpdate = useCallback(() => {
    // Auto-scroll transcript
    setTimeout(() => {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const handleError = useCallback((error: string, fatal?: boolean) => {
    console.error("Live API error:", error, fatal ? "(fatal)" : "");
    setErrorMessage(error);
    if (fatal) {
      toast.error("Call Ended", {
        description: error,
        duration: 8000,
      });
      // Disconnect will be called after the hook re-renders
      setTimeout(() => disconnectRef.current?.(), 100);
    }
  }, []);

  const handlePersonaLeft = useCallback(() => {
    // The AI persona has decided to end the meeting
    console.log("Persona has left the call");
  }, []);

  const {
    isConnected,
    isConnecting,
    isReconnecting,
    transcript,
    insights,
    objections,
    moods,
    personaLeft,
    connect,
    disconnect,
    isMuted,
    toggleMic,
    getDuration,
    logManualInsight,
    isRecording,
    isAISpeaking,
    isModelThinking,
    streamingModelText,
    isPersonaResearching,
    researchTopic,
    startRecording,
    stopRecording,
    waitForPlaybackFinish,
  } = useGeminiLive({
    systemPrompt,
    persona: persona as unknown as Record<string, unknown>,
    metadata: knowledgeMetadata as unknown as Record<string, unknown>,
    scenario: (scenario || undefined) as unknown as Record<string, unknown>,
    userName: sessionUserName.trim() || undefined,
    companyName: knowledgeMetadata?.productCategory || undefined,
    voiceName,
    teamId: teamId || persona.teamId,
    sessionId: callSessionId,
    onTranscriptUpdate: handleTranscriptUpdate,
    onError: handleError,
    onPersonaLeft: handlePersonaLeft,
  });

  // Keep disconnectRef in sync so handleError can call it
  disconnectRef.current = disconnect;

  // ─── Whisper HUD Logic ───────────────────────────────────────────────
  const [latestInsight, setLatestInsight] = useState<{
    insight: string;
    timestamp: number;
  } | null>(null);
  const [showHUD, setShowHUD] = useState(false);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (insights && insights.length > 0) {
      const last = insights[insights.length - 1];
      // Use both timestamp AND content to detect new insights
      if (
        last.timestamp !== latestInsight?.timestamp ||
        last.insight !== latestInsight?.insight
      ) {
        setLatestInsight(last);
        setShowHUD(true);

        if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
        hudTimeoutRef.current = setTimeout(() => {
          setShowHUD(false);
          hudTimeoutRef.current = null;
        }, 10000); // Show for 10 seconds for better readability
      }
    }
  }, [insights, latestInsight]);

  // ─── Persona Avatar Logic ────────────────────────────────────────────
  const getAvatarUrl = () => {
    // Priority: use the generated avatar URL if it exists
    if (persona.avatarUrl) return persona.avatarUrl;

    // Mapping personas to fallback images for the demo
    const name = persona.name.toLowerCase();
    if (name.includes("margaret") || name.includes("cfo"))
      return "/avatars/skeptical_cfo.png";
    if (name.includes("founder") || name.includes("eager"))
      return "/avatars/eager_founder.png";
    if (name.includes("architect") || name.includes("analytical"))
      return "/avatars/analytical_architect.png";
    return "/placeholder-avatar.png";
  };

  const avatarUrl = getAvatarUrl();
  const userAvatarUrl = user?.photoURL || "/placeholder-avatar.png";

  // ─── Call Timer ────────────────────────────────────────────────────────
  const handleTimerWarning = useCallback(() => {
    // Warning logic could go here if needed
  }, []);

  const handleTimeUp = useCallback(() => {
    setInputLocked(true);
    // Auto-end the call when time is up
    handleEndCallRef.current?.();
  }, []);

  const {
    elapsed,
    isRunning: isTimerRunning,
    warningTriggered,
    isTimeUp,
    start: startTimer,
    formattedRemaining,
    formattedElapsed,
  } = useCallTimer({
    durationMinutes: callDurationMinutes,
    onWarning: handleTimerWarning,
    onTimeUp: handleTimeUp,
  });

  // Handle auto-recording
  useEffect(() => {
    if (isConnected && !isRecording && startRecording) {
      startRecording();
    }
  }, [isConnected, isRecording, startRecording]);

  // Start the call timer when connected
  useEffect(() => {
    if (isConnected && durationSelected && !isTimerRunning) {
      startTimer();

      // Create call session in Firestore
      const userId = user?.uid || "anonymous";
      console.log(
        `[RoleplaySession] Creating call session ${callSessionId} for user ${userId}`,
      );
      createCallSession({
        id: callSessionId,
        userId,
        teamId: teamId || persona.teamId || "unknown",
        personaId: persona.id,
        userName: displayName,
        personaName: persona.name,
        personaRole: persona.role,
        personaAvatarUrl: persona.avatarUrl,
        callDurationMinutes,
        callStartTime: new Date().toISOString(),
        trackId: trackId || null,
        scenarioId: scenarioId || null,
        source: "roleplay",
      })
        .then(() =>
          console.log(
            `[RoleplaySession] Successfully created call session ${callSessionId}`,
          ),
        )
        .catch((err) =>
          console.error(
            `[RoleplaySession] Failed to create call session ${callSessionId}:`,
            err,
          ),
        );
    }
  }, [
    isConnected,
    durationSelected,
    isTimerRunning,
    startTimer,
    user?.uid,
    callSessionId,
    persona.id,
    persona.name,
    persona.role,
    persona.avatarUrl,
    displayName,
    callDurationMinutes,
    trackId,
    scenarioId,
  ]);

  // ─── Handle End Call ───────────────────────────────────────────────────
  const handleEndCallRef = useRef<(() => Promise<void>) | null>(null);

  const handleEndCall = async () => {
    let userId: string = "";
    let sessionId: string = "";
    // Use the elapsed time from useCallTimer for better accuracy than getDuration()
    const duration = elapsed;
    setIsCallFinished(true); // Persistently lock the UI

    // Stop recording FIRST — this awaits the MediaRecorder flush
    const audioBlob = (await stopRecording()) || undefined;

    // Wait for AI to finish speaking before disconnecting
    await waitForPlaybackFinish?.();

    disconnect();

    // Build transcript text with timestamps
    const transcriptText =
      transcript.length > 0
        ? transcript
            .map(
              (entry) =>
                `${entry.role === "user" ? displayName : persona.name}: ${entry.text}`,
            )
            .join("\n\n")
        : `[No transcript was captured for this ${formatTime(duration)} call with ${persona.name}]`;

    setEvaluating(true);
    setLoadingStage("audio");
    setLoadingProgress(10);

    try {
      userId = user?.uid || "anonymous";
      sessionId = callSessionId; // Use the same ID for legacy session

      let audioUrl = "";
      if (audioBlob && user) {
        try {
          audioUrl = await uploadSessionAudio(userId, sessionId, audioBlob);
        } catch (uploadError) {
          console.error("Failed to upload audio:", uploadError);
        }
      }

      setLoadingStage("evaluating");
      setLoadingProgress(30);

      // Generate legacy evaluation (fast)
      const evaluation = await evaluateSessionAction({
        transcript: transcriptText,
        personaName: persona.name,
        personaRole: persona.role,
        intensityLevel: persona.intensityLevel,
        durationSeconds: duration,
        trackId,
        scenarioId,
      }).catch((err) => {
        console.error("Legacy evaluation failed:", err);
        return null;
      });

      setLoadingProgress(80);
      setLoadingStage("saving");

      setLoadingProgress(95);
      setLoadingStage("finalizing");

      // Persist end-of-call state to callSessions (single source of truth)
      console.log(
        `[RoleplaySession] Updating call session ${callSessionId} (end-of-call state)`,
      );
      await updateCallSession(callSessionId, {
        callEndTime: new Date().toISOString(),
        callStatus: "ended",
        legacyEvaluation: evaluation,
        durationSeconds: duration,
        transcript: transcriptText, // Add full transcript string
        insights: insights.map((i) => ({
          insight: i.insight,
          timestamp: i.timestamp,
        })),
        objections,
        moods,
        audioUrl: audioUrl || undefined,
      }).catch((err) =>
        console.error(`[RoleplaySession] Failed to update call session:`, err),
      );

      setLoadingProgress(100);
      // ─── Update User Metrics ──────────────────────────────────────────
      if (user) {
        const callSessionData = {
          id: callSessionId,
          userId,
          teamId: teamId || persona.teamId || "unknown",
          personaId: persona.id,
          userName: displayName,
          personaName: persona.name,
          personaRole: persona.role,
          durationSeconds: duration,
          callDurationMinutes: callDurationMinutes,
          callStatus: "ended",
          transcriptMessages: transcript,
          feedbackReport: null,
          legacyEvaluation: evaluation,
          insights: insights.map((i) => ({
            insight: i.insight,
            timestamp: i.timestamp,
          })),
          createdAt: new Date().toISOString(),
        } as unknown as CallSession;
        updateUserMetrics(user.uid, callSessionData).catch((err) =>
          console.error("Failed to update user metrics:", err),
        );
      }

      router.push(`/dashboard/history/${sessionId}`);
      return;
    } catch (error) {
      console.error("Evaluation error:", error);
      sessionId = callSessionId;

      // Save what we have to callSessions even on error
      await updateCallSession(callSessionId, {
        callEndTime: new Date().toISOString(),
        callStatus: "ended",
        durationSeconds: duration,
        transcript: transcriptText, // Add full transcript string even on error
        insights: insights.map((i) => ({
          insight: i.insight,
          timestamp: i.timestamp,
        })),
        objections,
        moods,
      }).catch((err) =>
        console.error(
          "[RoleplaySession] Failed to update call session on error:",
          err,
        ),
      );
      router.push(`/dashboard/history/${sessionId}`);
      return;
    } finally {
      setEvaluating(false);
    }
  };

  // Keep ref updated for timer callback
  handleEndCallRef.current = handleEndCall;

  // Show evaluating screen or persistent finished state
  if (evaluating || isCallFinished) {
    return (
      <EvaluatingStage
        loadingStage={loadingStage}
        loadingProgress={loadingProgress}
      />
    );
  }

  // ─── Show duration selector before starting ─────────────────────────
  if (nameSubmitted && !durationSelected) {
    return (
      <DurationSelectorStage
        onBack={onBack}
        persona={persona}
        avatarUrl={avatarUrl}
        knowledgeMetadata={knowledgeMetadata}
        track={track}
        scenario={scenario}
        callDurationMinutes={callDurationMinutes}
        onSelectDuration={(mins) => {
          setCallDurationMinutes(mins);
          setDurationSelected(true);
        }}
      />
    );
  }

  // Show name input before proceeding
  if (!nameSubmitted) {
    return (
      <NameInputStage
        persona={persona}
        avatarUrl={avatarUrl}
        knowledgeMetadata={knowledgeMetadata}
        sessionUserName={sessionUserName}
        setSessionUserName={setSessionUserName}
        setNameSubmitted={setNameSubmitted}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="animate-fade-up mx-auto w-full max-w-6xl">
      {/* Floating alerts */}
      <div className="space-y-2 pb-3">
        {errorMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-2.5 backdrop-blur-sm">
            <AlertCircle className="size-4 shrink-0 text-rose-500" />
            <p className="flex-1 text-xs font-medium text-rose-700">
              {errorMessage}
            </p>
            <button
              className="text-[10px] font-medium text-rose-400 hover:text-rose-600"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {warningTriggered && !isTimeUp && isConnected && (
          <div className="animate-fade-up flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 backdrop-blur-sm">
            <AlertTriangle className="size-4 shrink-0 animate-pulse text-amber-500" />
            <p className="flex-1 text-xs font-medium text-amber-700">
              {CALL_WARNING_THRESHOLD_SECONDS}s remaining — wrap up your key
              points
            </p>
            <span className="font-mono text-sm font-bold text-amber-700">
              {formattedRemaining}
            </span>
          </div>
        )}

        {personaLeft && isConnected && (
          <div className="animate-fade-up flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 backdrop-blur-sm">
            <UserX className="size-4 shrink-0 text-amber-500" />
            <p className="flex-1 text-xs font-medium text-amber-700">
              {persona.name} ended the meeting — end the call to see your review
            </p>
            <Button
              onClick={handleEndCall}
              size="sm"
              className="h-7 shrink-0 gap-1.5 rounded-lg bg-amber-500 px-3 text-[11px] font-medium text-white hover:bg-amber-600"
            >
              <PhoneOff className="size-3" />
              End Call
            </Button>
          </div>
        )}
      </div>

      {/* Main call container */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-lg"
        style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}
      >
        <CallHeader
          persona={persona}
          avatarUrl={avatarUrl}
          userAvatarUrl={userAvatarUrl}
          track={track}
          isConnected={isConnected}
          warningTriggered={warningTriggered}
          formattedRemaining={formattedRemaining}
          elapsed={elapsed}
          formatTime={formatTime}
          personaLeft={personaLeft}
          displayName={displayName}
        />

        <div className="flex min-h-0 flex-1">
          {/* Left: persona card + controls */}
          <div className="flex min-w-0 flex-1 flex-col">
            <PersonaCallCard
              persona={persona}
              avatarUrl={avatarUrl}
              userAvatarUrl={userAvatarUrl}
              isConnected={isConnected}
              isConnecting={isConnecting}
              personaLeft={personaLeft}
              isAISpeaking={isAISpeaking}
              callDurationMinutes={callDurationMinutes}
              displayName={displayName}
              showHUD={showHUD}
              latestInsight={latestInsight}
              isPersonaResearching={isPersonaResearching}
              researchTopic={researchTopic}
            />

            <CallControls
              isConnected={isConnected}
              isConnecting={isConnecting}
              isReconnecting={isReconnecting}
              isMuted={isMuted}
              personaLeft={personaLeft}
              inputLocked={inputLocked}
              onToggleMic={toggleMic}
              onLogInsight={logManualInsight}
              onConnect={connect}
              onEndCall={handleEndCall}
            />
          </div>

          {/* Right: sidebar */}
          <CallSidebar
            persona={persona}
            knowledgeMetadata={knowledgeMetadata}
            track={track}
            scenario={scenario}
            isConnected={isConnected}
            personaLeft={personaLeft}
            moods={moods}
            warningTriggered={warningTriggered}
            formattedRemaining={formattedRemaining}
            callDurationMinutes={callDurationMinutes}
          >
            <TranscriptArea
              transcript={transcript}
              isConnected={isConnected}
              persona={persona}
              displayName={displayName}
              transcriptEndRef={transcriptEndRef}
              isModelThinking={isModelThinking}
              streamingModelText={streamingModelText}
            />
          </CallSidebar>
        </div>
      </div>
    </div>
  );
}
