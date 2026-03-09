"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  MessageSquare,
  ArrowLeft,
  Loader2,
  AlertCircle,
  UserX,
  User,
  Zap,
  Lightbulb,
  Clock,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useGeminiLive } from "@/hooks/use-gemini-live";
import { useCallTimer } from "@/hooks/use-call-timer";
import type { Product, Persona, Session } from "@/lib/db";
import {
  saveSession,
  uploadSessionAudio,
  createCallSession,
  updateCallSession,
} from "@/lib/db";
import { CallDurationSelector } from "@/components/call-duration-selector";
import {
  evaluateSession as evaluateSessionAction,
  generateFeedbackReport,
  generateCoachDebrief,
} from "@/app/actions/api";
import { useAuth } from "@/context/auth-context";
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
  type Product as SharedProduct,
  FEMALE_VOICES,
  MALE_VOICES,
} from "@reptrainer/shared";

interface RoleplaySessionProps {
  persona: Persona;
  product: Product;
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
  product,
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
      product as unknown as SharedProduct,
      {
        scenario: scenario || undefined,
        userName: sessionUserName.trim() || undefined,
      },
    );
  }, [persona, product, scenario, sessionUserName]);

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
    transcript,
    insights,
    personaLeft,
    connect,
    disconnect,
    getDuration,
    logManualInsight,
    isRecording,
    isAISpeaking,
    startRecording,
    stopRecording,
    waitForPlaybackFinish,
  } = useGeminiLive({
    systemPrompt,
    voiceName,
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
    // Mapping personas to generated images for the demo
    const name = persona.name.toLowerCase();
    if (name.includes("margaret") || name.includes("cfo"))
      return "/home/obed/.gemini/antigravity/brain/26f6e2ab-6bb7-4968-8780-8eafd8ad77ee/skeptical_cfo_avatar_1772681589501.png";
    if (name.includes("founder") || name.includes("eager"))
      return "/home/obed/.gemini/antigravity/brain/26f6e2ab-6bb7-4968-8780-8eafd8ad77ee/eager_founder_avatar_1772681609647.png";
    if (name.includes("architect") || name.includes("analytical"))
      return "/home/obed/.gemini/antigravity/brain/26f6e2ab-6bb7-4968-8780-8eafd8ad77ee/analytical_architect_avatar_1772681629525.png";
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
    isRunning: isTimerRunning,
    warningTriggered,
    isTimeUp,
    start: startTimer,
    formattedRemaining,
  } = useCallTimer({
    durationMinutes: callDurationMinutes,
    onWarning: handleTimerWarning,
    onTimeUp: handleTimeUp,
  });

  // ─── Timer ─────────────────────────────────────────────────────────────
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setCallDuration(getDuration());
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected, getDuration]);

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
        personaId: persona.id,
        productId: product.id,
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
    product.id,
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
    const duration = getDuration();

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

      // Generate both legacy evaluation and enhanced feedback report in parallel
      const [evaluation, feedback] = await Promise.allSettled([
        evaluateSessionAction({
          transcript: transcriptText,
          personaName: persona.name,
          personaRole: persona.role,
          intensityLevel: persona.intensityLevel,
          durationSeconds: duration,
          trackId,
          scenarioId,
        }),
        generateFeedbackReport({
          transcript: transcriptText,
          personaName: persona.name,
          personaRole: persona.role,
          intensityLevel: persona.intensityLevel,
          durationSeconds: duration,
          trackId,
          scenarioId,
        }),
      ]);

      setLoadingProgress(80);
      setLoadingStage("saving");

      const evalResult =
        evaluation.status === "fulfilled" ? evaluation.value : null;
      const feedbackResult =
        feedback.status === "fulfilled"
          ? (feedback.value as FeedbackReport)
          : null;

      if (feedback.status === "rejected") {
        console.error("Feedback generation failed:", feedback.reason);
      }

      // Save legacy session
      const session: Session = {
        id: sessionId,
        userId: userId,
        personaId: persona.id,
        userName: displayName,
        productId: product.id,
        personaName: persona.name,
        personaRole: persona.role,
        personaAvatarUrl: persona.avatarUrl,
        transcript: transcriptText,
        durationSeconds: duration,
        evaluation: evalResult,
        insights: insights,
        teamId: teamId || persona.teamId || product.teamId,
        createdAt: new Date().toISOString(),
        audioUrl: audioUrl || undefined,
      };

      await saveSession(session);

      setLoadingProgress(95);
      setLoadingStage("finalizing");

      // Update call session in Firestore
      console.log(
        `[RoleplaySession] Updating call session ${callSessionId} at end of call`,
      );
      await updateCallSession(callSessionId, {
        callEndTime: new Date().toISOString(),
        callStatus: "ended",
        feedbackReport: feedbackResult,
        legacyEvaluation: evalResult,
        insights: insights.map((i) => ({
          insight: i.insight,
          timestamp: i.timestamp,
        })),
      })
        .then(() =>
          console.log(
            `[RoleplaySession] Successfully updated call session ${callSessionId}`,
          ),
        )
        .catch((err) =>
          console.error(
            `[RoleplaySession] Failed to update call session ${callSessionId}:`,
            err,
          ),
        );

      // ─── Generate Coach Debrief if duration >= 3 mins ───────────────────
      if (duration >= 180) {
        try {
          console.log("[RoleplaySession] Fetching Coach Debrief...");
          const debrief = await generateCoachDebrief({
            transcript: transcriptText,
            personaName: persona.name,
            personaRole: persona.role,
            durationSeconds: duration,
          });

          // Persist debrief to Firestore
          console.log("[RoleplaySession] Persisting debrief to Firestore...");
          await Promise.all([
            updateCallSession(callSessionId, { debrief }),
            saveSession({ ...session, debrief }),
          ]).catch((err) => console.error("Failed to persist debrief:", err));
        } catch (debriefError) {
          console.error("Coach Debrief generation failed:", debriefError);
        }
      }

      setLoadingProgress(100);
      // ─── Update User Metrics ──────────────────────────────────────────
      if (user) {
        // Construct a CallSession-like object for metrics update
        const callSessionData = {
          ...session,
          transcriptMessages: transcript,
          feedbackReport: feedbackResult,
          legacyEvaluation: evalResult,
        } as unknown as CallSession;
        updateUserMetrics(user.uid, callSessionData).catch((err) =>
          console.error("Failed to update user metrics:", err),
        );
      }

      router.push(`/dashboard/history/${sessionId}`);
      return;
    } catch (error) {
      console.error("Evaluation error:", error);
      userId = user?.uid || "anonymous";
      sessionId = callSessionId; // Use the same ID for legacy session

      const session: Session = {
        id: sessionId,
        userId: userId,
        personaId: persona.id,
        userName: displayName,
        productId: product.id,
        personaName: persona.name,
        personaRole: persona.role,
        personaAvatarUrl: persona.avatarUrl,
        transcript: transcriptText,
        durationSeconds: duration,
        evaluation: null,
        insights: insights,
        teamId: teamId || persona.teamId || product.teamId,
        createdAt: new Date().toISOString(),
      };
      await saveSession(session);
      router.push(`/session/${sessionId}`);
      return;
    } finally {
      setEvaluating(false);
    }
  };

  // Keep ref updated for timer callback
  handleEndCallRef.current = handleEndCall;

  // Show evaluating screen
  if (evaluating) {
    const stageLabels = {
      audio: "Uploading call audio...",
      evaluating: "Analyzing performance with Senior Sales Coach...",
      saving: "Saving session results...",
      finalizing: "Finalizing your report...",
    };

    return (
      <div className="animate-fade-up flex flex-col items-center justify-center py-20">
        <div className="relative mb-10">
          <div className="from-charcoal/5 to-charcoal/10 relative flex size-32 items-center justify-center overflow-hidden rounded-full bg-linear-to-br">
            {/* Liquid Fill Progress */}
            <div
              className="bg-charcoal/10 absolute right-0 bottom-0 left-0 transition-all duration-700 ease-out"
              style={{ height: `${loadingProgress}%` }}
            />
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-charcoal text-2xl font-bold">
                {loadingProgress}%
              </span>
            </div>
          </div>
          <div className="border-charcoal/5 absolute inset-0 animate-pulse rounded-full border-2" />
        </div>

        <div className="max-w-sm space-y-4 px-6 text-center">
          <h3 className="text-charcoal text-xl font-bold">
            {stageLabels[loadingStage]}
          </h3>
          <p className="text-warm-gray text-sm leading-relaxed">
            {loadingStage === "evaluating"
              ? "Our AI is reviewing every word of your transcript to provide specific, actionable feedback on your sales technique."
              : "Hang tight, we're making sure all your call data is safely stored in your dashboard."}
          </p>

          {/* Progress Bar Mini */}
          <div className="bg-cream border-border/30 mt-8 h-1.5 w-full overflow-hidden rounded-full border">
            <div
              className="bg-charcoal h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-700 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Loader2 className="text-warm-gray size-3 animate-spin" />
            <span className="text-warm-gray text-[10px] font-semibold tracking-widest uppercase">
              Processing Securely
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Show duration selector before starting ─────────────────────────
  if (nameSubmitted && !durationSelected) {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNameSubmitted(false)}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>

        <Card className="border-border/60 mx-auto max-w-lg rounded-3xl border bg-white p-10 shadow-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="bg-cream mb-6 flex size-20 items-center justify-center rounded-2xl">
              <Clock className="text-charcoal size-10" />
            </div>
            <h2 className="heading-serif text-charcoal mb-3 text-3xl">
              Set Call Duration
            </h2>
            <p className="text-warm-gray max-w-sm text-sm leading-relaxed">
              How long should this sales call last? The timer will count down
              and the call will automatically end when time runs out.
            </p>
          </div>

          <CallDurationSelector
            defaultDuration={callDurationMinutes}
            onSelect={(mins) => {
              setCallDurationMinutes(mins);
              setDurationSelected(true);
            }}
          />
        </Card>

        {/* Track info */}
        {track && scenario && (
          <Card className="border-border/40 mx-auto max-w-lg rounded-2xl border bg-white/60 p-5">
            <div className="flex items-center gap-3">
              <BookOpen className="text-charcoal size-5" />
              <div className="min-w-0 flex-1">
                <h3 className="text-charcoal truncate text-sm font-semibold">
                  {track.name}: {scenario.name}
                </h3>
                <p className="text-warm-gray truncate text-xs">
                  Difficulty {scenario.difficulty}/3 · Focus:{" "}
                  {Object.entries(scenario.evaluationWeighting)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 2)
                    .map(([k]) => k.replace(/_/g, " "))
                    .join(", ")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Persona preview */}
        <Card className="border-border/40 mx-auto max-w-lg rounded-2xl border bg-white/60 p-5">
          <div className="flex items-center gap-4">
            {persona.avatarUrl || avatarUrl ? (
              <Image
                src={
                  persona.avatarUrl ||
                  (avatarUrl as string) ||
                  "/placeholder-avatar.png"
                }
                alt={persona.name}
                width={48}
                height={48}
                className="bg-cream shrink-0 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="bg-charcoal text-cream flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                {persona.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-charcoal truncate text-sm font-semibold">
                {persona.name}
              </h3>
              <p className="text-warm-gray truncate text-xs">{persona.role}</p>
            </div>
            <div className="text-warm-gray-light bg-cream/50 border-border/20 rounded-full border px-3 py-1 text-[11px] font-medium">
              {product?.companyName
                ? `Evaluating ${product.companyName}`
                : "Loading product…"}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show name input before proceeding
  if (!nameSubmitted) {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>

        <Card className="border-border/60 mx-auto max-w-lg rounded-3xl border bg-white p-10 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="bg-cream mb-6 flex size-20 items-center justify-center rounded-2xl">
              <User className="text-charcoal size-10" />
            </div>
            <h2 className="heading-serif text-charcoal mb-3 text-3xl">
              Before We Start
            </h2>
            <p className="text-warm-gray mb-8 max-w-sm text-sm leading-relaxed">
              Enter your name so {persona.name} knows who they&apos;re meeting
              with. This will be used in the transcript.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (sessionUserName.trim()) setNameSubmitted(true);
              }}
              className="w-full space-y-5"
            >
              <Input
                value={sessionUserName}
                onChange={(e) => setSessionUserName(e.target.value)}
                placeholder="Your name (e.g., Alex Johnson)"
                className="border-border/60 bg-cream/30 focus:ring-charcoal/10 h-14 rounded-2xl text-center text-base transition-all focus:bg-white"
                autoFocus
                required
              />
              <Button
                type="submit"
                className="bg-charcoal text-cream hover:bg-charcoal-light h-14 w-full gap-3 rounded-2xl text-base font-semibold shadow-md transition-all active:scale-[0.98]"
                disabled={!sessionUserName.trim()}
              >
                Continue
                <Phone className="size-5" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Persona preview */}
        <Card className="border-border/40 mx-auto max-w-lg rounded-2xl border bg-white/60 p-5">
          <div className="flex items-center gap-4">
            {persona.avatarUrl || avatarUrl ? (
              <Image
                src={
                  persona.avatarUrl ||
                  (avatarUrl as string) ||
                  "/placeholder-avatar.png"
                }
                alt={persona.name}
                width={48}
                height={48}
                className="bg-cream shrink-0 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="bg-charcoal text-cream flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                {persona.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-charcoal truncate text-sm font-semibold">
                {persona.name}
              </h3>
              <p className="text-warm-gray truncate text-xs">{persona.role}</p>
            </div>
            <div className="text-warm-gray-light bg-cream/50 border-border/20 rounded-full border px-3 py-1 text-[11px] font-medium">
              {product?.companyName
                ? `Evaluating ${product.companyName}`
                : "Loading product…"}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* Error Banner */}
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

      {/* 45-second Warning Banner */}
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

      {/* Persona Left Banner */}
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

      {/* Call Area — Google Meet-style layout */}
      <div
        className="border-border/40 flex flex-col overflow-hidden rounded-[2rem] border bg-white shadow-xl"
        style={{ height: "calc(100vh - 120px)", minHeight: "650px" }}
      >
        {/* Top Header Bar */}
        <div className="flex shrink-0 items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-glow flex size-8 items-center justify-center rounded-lg">
              <Phone className="size-4 text-black" />
            </div>
            <div>
              <h3 className="text-charcoal text-sm leading-tight font-semibold">
                Sales Roleplay Session
              </h3>
              <p className="text-warm-gray text-[11px]">
                {persona.name} · {persona.role}
                {track ? ` · ${track.name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConnected && (
              <>
                {/* Countdown timer */}
                <div
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                    warningTriggered
                      ? "animate-pulse border-amber-300 bg-amber-50"
                      : "bg-cream border-border/40"
                  }`}
                >
                  <Clock
                    className={`size-3.5 ${warningTriggered ? "text-amber-600" : "text-warm-gray"}`}
                  />
                  <span
                    className={`font-mono text-xs font-bold ${
                      warningTriggered ? "text-amber-700" : "text-charcoal"
                    }`}
                  >
                    {formattedRemaining}
                  </span>
                </div>

                {/* Live indicator + elapsed time */}
                <div className="bg-cream border-border/40 flex items-center gap-2 rounded-full border px-3 py-1.5">
                  <div
                    className={`size-2 rounded-full ${personaLeft ? "bg-rose-500" : "animate-pulse bg-emerald-500"}`}
                  />
                  <span className="text-charcoal font-mono text-xs font-medium">
                    {formatTime(callDuration)}
                  </span>
                </div>

                {/* Coach Debrief Countdown */}
                {callDuration < 180 && !personaLeft && (
                  <div className="bg-charcoal/5 border-charcoal/10 flex items-center gap-2 rounded-full border px-3 py-1.5">
                    <Zap className="size-3 text-amber-600" />
                    <span className="text-charcoal/60 text-[10px] font-bold tracking-tight uppercase">
                      Debrief Unlocks in {formatTime(180 - callDuration)}
                    </span>
                  </div>
                )}
                {callDuration >= 180 && !personaLeft && (
                  <div className="animate-in fade-in zoom-in-95 flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 duration-500">
                    <Zap className="size-3 fill-emerald-600 text-emerald-600" />
                    <span className="text-[10px] font-bold tracking-tight text-emerald-600 uppercase">
                      Coach Debrief Ready
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center -space-x-2">
              <div className="bg-cream text-charcoal flex size-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="bg-cream text-charcoal flex size-8 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[10px] font-bold shadow-sm">
                {persona.avatarUrl || avatarUrl ? (
                  <Image
                    src={
                      persona.avatarUrl ||
                      (avatarUrl as string) ||
                      "/placeholder-avatar.png"
                    }
                    alt={persona.name}
                    className="object-cover"
                    width={32}
                    height={32}
                  />
                ) : (
                  persona.name.charAt(0)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
          {/* Left: Stage + Controls */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {/* Main Speaker Stage */}
            <div className="bg-cream/40 border-border/40 relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border">
              {/* "You" label top-left */}
              {isConnected && !personaLeft && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <div className="text-charcoal border-border/40 flex size-8 items-center justify-center rounded-full border bg-white text-xs font-bold shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-charcoal text-xs font-medium">
                    {displayName}
                  </span>
                </div>
              )}

              {/* Pre-call idle state */}
              {!isConnected && !isConnecting && !personaLeft && (
                <div className="z-10 flex flex-col items-center justify-center p-6 text-center">
                  <div className="border-border/60 text-charcoal mb-4 flex size-24 items-center justify-center overflow-hidden rounded-full border bg-white text-5xl font-bold shadow-sm sm:size-32">
                    {persona.avatarUrl || avatarUrl ? (
                      <Image
                        src={
                          persona.avatarUrl ||
                          (avatarUrl as string) ||
                          "/placeholder-avatar.png"
                        }
                        alt={persona.name}
                        width={86}
                        height={86}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      persona.name.charAt(0)
                    )}
                  </div>
                  <h3 className="text-charcoal mb-1 text-lg font-semibold">
                    Ready to start
                  </h3>
                  <p className="text-warm-gray max-w-[280px] text-sm">
                    Start the call to begin your {callDurationMinutes}-minute
                    sales roleplay with {persona.name}.
                  </p>
                </div>
              )}

              {/* Connecting state */}
              {isConnecting && (
                <div className="z-10 flex flex-col items-center justify-center p-6 text-center">
                  <div className="border-border/60 relative mb-4 flex size-24 items-center justify-center rounded-full border bg-white shadow-sm sm:size-32">
                    <Loader2 className="text-charcoal size-10 animate-spin" />
                    <div className="border-charcoal/10 animate-pulse-ring absolute inset-0 rounded-full border-2" />
                  </div>
                  <h3 className="text-charcoal mb-1 text-lg font-semibold">
                    Connecting...
                  </h3>
                  <p className="text-warm-gray text-sm">
                    Setting up your call with {persona.name}
                  </p>
                </div>
              )}

              {/* Live call: persona avatar with visualizer */}
              {isConnected && !personaLeft && (
                <div className="z-10 flex flex-col items-center justify-center">
                  <div className="border-border/60 text-charcoal relative flex size-32 items-center justify-center overflow-hidden rounded-full border bg-white text-5xl font-bold shadow-md sm:size-40">
                    <div className="from-cream flex size-full items-center justify-center bg-linear-to-br to-white">
                      {persona.avatarUrl || avatarUrl ? (
                        <Image
                          src={
                            persona.avatarUrl ||
                            (avatarUrl as string) ||
                            "/placeholder-avatar.png"
                          }
                          alt={persona.name}
                          className="h-full w-full object-cover"
                          width={86}
                          height={86}
                        />
                      ) : (
                        persona.name.charAt(0)
                      )}
                    </div>
                    {isAISpeaking && (
                      <div className="border-charcoal/20 absolute inset-0 animate-pulse rounded-full border-[6px]" />
                    )}
                    {isAISpeaking && (
                      <div className="border-charcoal/10 animate-pulse-ring absolute inset-[-10%] rounded-full border-2" />
                    )}
                  </div>

                  {/* Whisper Coach HUD Overlay */}
                  <div
                    className={`absolute bottom-24 left-1/2 z-20 w-full max-w-sm -translate-x-1/2 px-4 transition-all duration-500 ease-out ${
                      showHUD
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-4 opacity-0"
                    }`}
                  >
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200/40 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                        <Zap className="size-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold tracking-widest text-amber-600 uppercase">
                          Whisper Coach
                        </p>
                        <p className="text-charcoal mt-0.5 text-xs leading-relaxed font-medium">
                          {latestInsight?.insight ||
                            "Analyzing conversation..."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Speaking Indicator */}
                  <div className="mt-4 h-6">
                    {isAISpeaking ? (
                      <div className="animate-fade-in flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-medium text-emerald-600">
                        <div className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Buyer is speaking...
                      </div>
                    ) : (
                      <div className="text-warm-gray text-[10px] font-medium">
                        Listening...
                      </div>
                    )}
                  </div>

                  {/* Audio visualizer */}
                  <div className="mt-2 flex h-8 items-end gap-1.5">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className={`bg-charcoal/40 w-1 rounded-full transition-all duration-300 ${
                          isAISpeaking ? "animate-sound-wave" : "h-1"
                        }`}
                        style={{
                          animationDelay: `${i * 0.12}s`,
                          height: isAISpeaking ? undefined : "4px",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Persona left state */}
              {personaLeft && (
                <div className="z-10 flex flex-col items-center justify-center p-6 text-center">
                  <div className="border-border/60 mb-4 flex size-24 items-center justify-center rounded-full border bg-white shadow-sm">
                    <UserX className="text-charcoal/40 size-10" />
                  </div>
                  <h3 className="text-charcoal mb-1 text-lg font-semibold">
                    {persona.name} left
                  </h3>
                  <p className="text-warm-gray max-w-[260px] text-sm">
                    The buyer has ended the meeting. End the call to see your
                    review.
                  </p>
                </div>
              )}

              {/* Participant name badge bottom-left */}
              <div className="border-border/40 absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                <span className="text-charcoal text-sm font-medium">
                  {persona.name}
                </span>
                {personaLeft ? (
                  <MicOff className="size-3.5 text-rose-600" />
                ) : (
                  <Mic className="text-charcoal/60 size-3.5" />
                )}
              </div>
            </div>

            {/* Floating Call Controls */}
            <div className="flex shrink-0 items-center justify-center gap-3 py-2">
              {/* Mic toggle */}
              <button
                className="border-border/40 hover:bg-cream text-charcoal flex size-11 items-center justify-center rounded-full border bg-white shadow-sm transition-colors"
                disabled={inputLocked}
              >
                {isConnected ? (
                  <Mic className="size-5" />
                ) : (
                  <MicOff className="text-warm-gray size-5" />
                )}
              </button>

              {/* Log Insight Button */}
              {isConnected && !personaLeft && !inputLocked && (
                <button
                  onClick={logManualInsight}
                  title="Log Sales Insight"
                  className="border-border/40 hover:bg-cream flex size-11 items-center justify-center rounded-full border bg-white text-amber-500 shadow-sm transition-colors"
                >
                  <Lightbulb className="size-5" />
                </button>
              )}

              {/* Start / End Call */}
              {!isConnected && !isConnecting && !personaLeft ? (
                <button
                  onClick={connect}
                  disabled={inputLocked}
                  className="bg-charcoal text-cream hover:bg-charcoal-light group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  <Phone className="size-4" />
                  <span className="text-sm">Start Call</span>
                </button>
              ) : (
                <button
                  onClick={handleEndCall}
                  className="flex size-11 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition-colors hover:bg-rose-600"
                >
                  <PhoneOff className="size-5" />
                </button>
              )}
            </div>

            {/* Bottom Participant Strip */}
          </div>

          {/* Right Sidebar */}
          <div className="hidden w-[380px] shrink-0 flex-col gap-3 lg:flex xl:w-[420px]">
            {/* Meeting Overview Card */}
            <div className="shrink-0 rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-charcoal mb-2 text-lg font-semibold">
                Meeting overview
              </h3>
              <p className="text-warm-gray mb-4 text-xs leading-relaxed">
                You&apos;re in a live sales roleplay with{" "}
                <strong className="text-charcoal">{persona.name}</strong> (
                {persona.role}). This session is designed to test your pitch,
                objection handling, and closing skills.
                {product?.companyName && (
                  <>
                    {" "}
                    You&apos;re pitching{" "}
                    <strong className="text-charcoal">
                      {product.companyName}
                    </strong>
                    .
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <div className="bg-cream flex-1 rounded-xl px-3 py-2 text-center">
                  <p className="text-warm-gray mb-0.5 text-[10px] tracking-wider uppercase">
                    Intensity
                  </p>
                  <p className="text-charcoal text-sm font-semibold">
                    {persona.intensityLevel}/5
                  </p>
                </div>
                <div className="bg-cream flex-1 rounded-xl px-3 py-2 text-center">
                  <p className="text-warm-gray mb-0.5 text-[10px] tracking-wider uppercase">
                    Time Left
                  </p>
                  <p
                    className={`font-mono text-sm font-semibold ${warningTriggered ? "text-amber-600" : "text-charcoal"}`}
                  >
                    {isConnected
                      ? formattedRemaining
                      : `${callDurationMinutes}:00`}
                  </p>
                </div>
              </div>

              {/* Track badge */}
              {track && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                  <BookOpen className="size-3.5 text-sky-600" />
                  <span className="text-[11px] font-medium text-sky-700">
                    {track.name}
                    {scenario ? `: ${scenario.name}` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Coach Mode static panel removed (moved to sidebar tabs) */}

            {/* Chat / Transcript */}
            <div className="border-border/40 bg-cream/20 flex shrink-0 items-center gap-2 border-b px-4 py-3">
              <MessageSquare className="text-warm-gray size-4" />
              <h3 className="text-charcoal text-sm font-semibold">
                Live Transcript
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {transcript.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                    <div className="bg-cream mb-3 flex size-10 items-center justify-center rounded-full">
                      <MessageSquare className="text-warm-gray size-4" />
                    </div>
                    <p className="text-warm-gray max-w-[180px] text-xs">
                      {isConnected
                        ? "Listening... conversation will appear here."
                        : "Start the call to see the live transcript."}
                    </p>
                  </div>
                ) : (
                  transcript.map((entry, i) => (
                    <div
                      key={i}
                      className={`animate-fade-up flex gap-2.5 ${
                        entry.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                      style={{
                        animationDelay: `${Math.min(i * 50, 200)}ms`,
                      }}
                    >
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          entry.role === "model"
                            ? "bg-charcoal text-cream"
                            : "bg-cream-dark text-charcoal"
                        }`}
                      >
                        {entry.role === "model"
                          ? persona.name.charAt(0)
                          : displayName.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                          entry.role === "user"
                            ? "bg-charcoal rounded-tr-sm text-white"
                            : "bg-cream/80 text-charcoal rounded-tl-sm"
                        }`}
                      >
                        <p
                          className={`mb-0.5 text-[9px] font-bold tracking-wider uppercase ${entry.role === "user" ? "text-white/50" : "text-warm-gray"}`}
                        >
                          {entry.role === "user" ? displayName : persona.name}
                        </p>
                        <p className="leading-relaxed">
                          {entry.text}
                          {entry.isStreaming && (
                            <span className="ml-1 inline-block h-3.5 w-1 animate-pulse rounded-full bg-current align-middle opacity-50" />
                          )}
                          {entry.role === "model" && entry.isInterrupted && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 opacity-80">
                              <PhoneOff className="size-2.5" /> [Interrupted]
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div ref={transcriptEndRef} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
