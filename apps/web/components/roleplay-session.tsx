"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  UserX,
  PhoneOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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

  // ─── Training Track Context ───────────────────────────────────────────
  const track = trackId ? TRAINING_TRACKS.find((t) => t.id === trackId) : null;
  const scenario = customScenario
    ? customScenario
    : track && scenarioId
      ? track.scenarios.find((s) => s.id === scenarioId)
      : null;

  const displayName = sessionUserName.trim() || "Sales Rep";

  // Build system prompt using the PersonaEngine
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

  const handleError = useCallback((error: string) => {
    console.error("Live API error:", error);
    setErrorMessage(error);
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
    startRecording,
    stopRecording,
    waitForPlaybackFinish,
  } = useGeminiLive({
    systemPrompt,
    voiceName,
    teamId: teamId || persona.teamId,
    sessionId: callSessionId,
    onTranscriptUpdate: handleTranscriptUpdate,
    onError: handleError,
    onPersonaLeft: handlePersonaLeft,
  });

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
    return null;
  };

  const avatarUrl = getAvatarUrl();

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
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {errorMessage && (
        <Card className="border-rose-glow/30 bg-rose-glow/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-rose-glow mt-0.5 size-5 shrink-0" />
            <div className="flex-1">
              <p className="text-rose-glow text-sm font-medium">
                Connection Error
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {errorMessage}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {warningTriggered && !isTimeUp && isConnected && (
        <Card className="animate-fade-up border-amber-500/40 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 shrink-0 animate-pulse text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700">
                ⏰ You have {CALL_WARNING_THRESHOLD_SECONDS} seconds left in
                this call.
              </p>
              <p className="mt-0.5 text-xs text-amber-600/80">
                Wrap up your key points and close the conversation.
              </p>
            </div>
            <span className="font-mono text-lg font-bold text-amber-700">
              {formattedRemaining}
            </span>
          </div>
        </Card>
      )}

      {personaLeft && isConnected && (
        <Card className="border-amber-glow/30 bg-amber-glow/5 animate-fade-up p-4">
          <div className="flex items-center gap-3">
            <UserX className="text-amber-glow size-5 shrink-0" />
            <div className="flex-1">
              <p className="text-amber-glow text-sm font-medium">
                {persona.name} has ended the meeting
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                The buyer has decided to leave. End the call to see your
                performance review.
              </p>
            </div>
            <Button
              onClick={handleEndCall}
              size="sm"
              className="bg-amber-glow hover:bg-amber-glow/90 shrink-0 gap-1.5 font-medium text-black"
            >
              <PhoneOff className="size-3.5" />
              End Call
            </Button>
          </div>
        </Card>
      )}

      <div
        className="border-border/40 flex flex-col overflow-hidden rounded-[2rem] border bg-white shadow-xl"
        style={{ height: "calc(100vh - 120px)", minHeight: "650px" }}
      >
        <CallHeader
          persona={persona}
          avatarUrl={avatarUrl}
          track={track}
          isConnected={isConnected}
          warningTriggered={warningTriggered}
          formattedRemaining={formattedRemaining}
          elapsed={elapsed}
          formatTime={formatTime}
          personaLeft={personaLeft}
          displayName={displayName}
        />

        <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <PersonaCallCard
              persona={persona}
              avatarUrl={avatarUrl}
              isConnected={isConnected}
              isConnecting={isConnecting}
              personaLeft={personaLeft}
              isAISpeaking={isAISpeaking}
              callDurationMinutes={callDurationMinutes}
              displayName={displayName}
              showHUD={showHUD}
              latestInsight={latestInsight}
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
