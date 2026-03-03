"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useGeminiLive } from "@/hooks/use-gemini-live";
import type { Product, Persona, Session } from "@/lib/db";
import { saveSession } from "@/lib/db";
import { SessionResults } from "@/components/session-results";
import { evaluateSession as evaluateSessionAction } from "@/app/actions/api";

interface RoleplaySessionProps {
  persona: Persona;
  product: Product;
  onBack: () => void;
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
}: RoleplaySessionProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [savedSession, setSavedSession] = useState<Session | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "insights">("chat");

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Build system prompt
  const intensityLabel = [
    "friendly skeptic",
    "tough negotiator",
    "hostile gatekeeper",
  ][persona.intensityLevel - 1];

  const displayName = userName.trim() || "Sales Rep";

  const systemPrompt = `You are an enterprise-level buyer named "${persona.name}", a ${persona.role}.

${persona.personalityPrompt}

You are intelligent, skeptical, time-conscious, and financially responsible.
Your role is to simulate a high-pressure real-world sales meeting.

The sales rep you're meeting with is named "${displayName}".

You are evaluating "${product?.companyName || "a product"}" — ${product?.description || "a software product"}.

─── INTENSITY & STYLE ───
- Intensity level: ${persona.intensityLevel}/3 (${intensityLabel}).
- Interruption frequency: ${persona.traits.interruptionFrequency}.
- Objection style: ${persona.traits.objectionStyle}.
- ${persona.objectionStrategy}

─── EVALUATION CRITERIA ───
You continuously evaluate the sales rep for:
- Confidence
- Clarity
- Directness
- ROI quantification
- Objection handling
- Avoidance behavior
- Rambling

─── BEHAVIOR RULES ───

1. INTERRUPT the rep if:
   - They avoid answering your question.
   - They speak vaguely or use buzzwords without substance.
   - They show uncertainty or hedge excessively.
   - They ramble without getting to the point.

2. SKEPTICAL MODE (default):
   - Ask sharp clarification questions.
   - Demand specific numbers, timelines, and case studies.
   - Repeat objections more firmly if not addressed directly.
   - Push for measurable ROI.

3. VEXED MODE (triggered by repeated vagueness or avoidance):
   - Interrupt mid-sentence.
   - Ask rapid-fire direct questions.
   - Keep responses short and impatient.
   - Challenge the rep's credibility.
   - Demand concrete proof, not promises.

4. DISENGAGED MODE (triggered if repeatedly unimpressed):
   - Reduce engagement and enthusiasm.
   - Give shorter, less interested responses.
   - Express doubt clearly ("I'm not sure this is for us").
   - Signal that you're losing patience.

5. ENDING THE MEETING (if value isn't demonstrated after multiple attempts):
   - Wind down naturally — express that you're not convinced.
   - End with a professional closing. Use phrases like:
     "I appreciate your time, but I don't think this is the right fit for us."
     "Thank you for the presentation, but we're going to pass on this."
     "I need to wrap up — I don't see enough value here for us to move forward."
     "I've heard enough. Thank you for your time, but this isn't what we're looking for."
   - Say goodbye naturally, like a real executive would.
   - After your closing, stay completely silent. Do NOT respond to anything else the rep says. The meeting is done.

${product?.objections && product.objections.length > 0 ? `─── KEY OBJECTIONS TO RAISE ───\nThese are your primary concerns. Raise them naturally during the conversation:\n${product.objections.map((o, i) => `${i + 1}. ${o}`).join("\n")}` : ""}

─── CRITICAL RULES ───
- Never break character. You are a REAL buyer, not an AI.
- Never explain the simulation or reference it being a training exercise.
- Start by introducing yourself briefly, then ask ${displayName} to pitch their product to you.
- Keep your opening warm but professional — let the rep set the tone before you push back.
- If the rep earns your respect with compelling, evidence-backed answers, you can soften slightly — but never become easy.
- You are the BUYER, not the sales rep. Do not pitch for them or fill in gaps they should address.

─── SALES COACHING & INSIGHTS (SILENT) ───
You have access to the "log_sales_insight" tool. Use it in the following ways:
1. **AUTONOMOUS LOGGING**: As the meeting progresses, identify 3-5 key moments where the rep shows a specific strength or a clear area for improvement (e.g., "Handled the price objection with ROI data" or "Avoided the direct question about security"). Call the tool IMMEDIATELY when these moments occur.
2. **BUTTON TRIGGERS**: If you receive "[SYSTEM_COMMAND: LOG_CURRENT_INSIGHT]", IMMEDIATELY call "log_sales_insight" with a summary of the rep's most recent performance. Do this SILENTLY; do not break character.
3. **VOCAL CUES**: If the rep says "Remember this" or "Log that", call the tool and acknowledge them briefly in character (e.g., "Noted. Now, about your implementation timeline...").

**CRITICAL**: Never mention "tools", "logging", or being an AI. Stay 100% in your persona as ${persona.name}.`;

  // Map persona gender to a matching Gemini voice
  const MALE_VOICES = ["Puck", "Charon", "Fenrir", "Orus"];
  const FEMALE_VOICES = ["Kore", "Aoede", "Leda", "Zephyr"];

  const getVoiceForPersona = useCallback(() => {
    const gender = persona.gender || "female";
    const voices = gender === "male" ? MALE_VOICES : FEMALE_VOICES;
    // Pick a consistent voice per persona (based on name hash)
    const hash = persona.name
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return voices[hash % voices.length];
  }, [persona.gender, persona.name]);

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
    startRecording,
    stopRecording,
  } = useGeminiLive({
    systemPrompt,
    voiceName,
    onTranscriptUpdate: handleTranscriptUpdate,
    onError: handleError,
    onPersonaLeft: handlePersonaLeft,
  });

  // Timer
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

  const handleEndCall = async () => {
    const duration = getDuration();

    // Stop recording FIRST — this awaits the MediaRecorder flush
    // so we capture all audio data before cleanup wipes resources.
    const audioBlob = (await stopRecording()) || undefined;

    disconnect();

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

    try {
      // Evaluate
      const evaluation = await evaluateSessionAction({
        transcript: transcriptText,
        personaName: persona.name,
        personaRole: persona.role,
        intensityLevel: persona.intensityLevel,
        durationSeconds: duration,
      });

      // Save session
      const session: Session = {
        id: uuidv4(),
        personaId: persona.id,
        userName: displayName,
        productId: product.id,
        transcript: transcriptText,
        durationSeconds: duration,
        evaluation: evaluation,
        insights: insights, // Save the real-time insights
        createdAt: new Date().toISOString(),
        audioBlob,
      };

      await saveSession(session);
      setSavedSession(session);
      setShowResults(true);
    } catch (error) {
      console.error("Evaluation error:", error);
      const session: Session = {
        id: uuidv4(),
        personaId: persona.id,
        userName: displayName,
        productId: product.id,
        transcript: transcriptText,
        durationSeconds: duration,
        evaluation: null,
        insights: insights,
        createdAt: new Date().toISOString(),
        audioBlob,
      };
      await saveSession(session);
      setSavedSession(session);
      setShowResults(true);
    } finally {
      setEvaluating(false);
    }
  };

  // Show results after call
  if (showResults && savedSession) {
    return (
      <SessionResults
        session={savedSession}
        persona={persona}
        product={product}
        onBack={onBack}
      />
    );
  }

  // Show evaluating screen
  if (evaluating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-up">
        <div className="relative mb-6">
          <div className="size-20 rounded-full bg-gradient-to-br from-violet-glow/20 to-emerald-glow/10 flex items-center justify-center">
            <Loader2 className="size-10 text-violet-glow animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full bg-violet-glow/10 animate-pulse-ring" />
        </div>
        <h3 className="text-xl font-bold mb-2">Analyzing Your Performance</h3>
        <p className="text-muted-foreground text-sm text-center max-w-sm">
          Our AI coach is reviewing your transcript and generating personalized
          feedback...
        </p>
      </div>
    );
  }

  // Show name input before proceeding
  if (!nameSubmitted) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>

        <Card className="p-10 bg-white border border-border/60 rounded-3xl max-w-lg mx-auto shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="size-20 rounded-2xl bg-cream flex items-center justify-center mb-6">
              <User className="size-10 text-charcoal" />
            </div>
            <h2 className="heading-serif text-3xl text-charcoal mb-3">
              Before We Start
            </h2>
            <p className="text-sm text-warm-gray mb-8 max-w-sm leading-relaxed">
              Enter your name so {persona.name} knows who they&apos;re meeting
              with. This will be used in the transcript.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (userName.trim()) setNameSubmitted(true);
              }}
              className="w-full space-y-5"
            >
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name (e.g., Alex Johnson)"
                className="h-14 text-center text-base rounded-2xl border-border/60 bg-cream/30 focus:bg-white focus:ring-charcoal/10 transition-all"
                autoFocus
                required
              />
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-charcoal text-cream hover:bg-charcoal-light gap-3 text-base font-semibold transition-all shadow-md active:scale-[0.98]"
                disabled={!userName.trim()}
              >
                Continue to Call
                <Phone className="size-5" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Persona preview */}
        <Card className="p-5 bg-white/60 border border-border/40 rounded-2xl max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-charcoal flex items-center justify-center text-lg font-bold text-cream shrink-0">
              {persona.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-charcoal text-sm truncate">
                {persona.name}
              </h3>
              <p className="text-xs text-warm-gray truncate">{persona.role}</p>
            </div>
            <div className="text-[11px] text-warm-gray-light font-medium bg-cream/50 px-3 py-1 rounded-full border border-border/20">
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
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <Card className="p-4 border-rose-glow/30 bg-rose-glow/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-rose-glow shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-glow">
                Connection Error
              </p>
              <p className="text-xs text-muted-foreground mt-1">
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

      {/* Persona Left Banner */}
      {personaLeft && isConnected && (
        <Card className="p-4 border-amber-glow/30 bg-amber-glow/5 animate-fade-up">
          <div className="flex items-center gap-3">
            <UserX className="size-5 text-amber-glow shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-glow">
                {persona.name} has ended the meeting
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The buyer has decided to leave. End the call to see your
                performance review.
              </p>
            </div>
            <Button
              onClick={handleEndCall}
              size="sm"
              className="gap-1.5 bg-amber-glow hover:bg-amber-glow/90 text-black font-medium shrink-0"
            >
              <PhoneOff className="size-3.5" />
              End Call
            </Button>
          </div>
        </Card>
      )}

      {/* Call Area — Google Meet-style layout */}
      <div
        className="bg-white border border-border/40 rounded-[2rem] overflow-hidden shadow-xl flex flex-col"
        style={{ height: "calc(100vh - 200px)", minHeight: "550px" }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-amber-glow flex items-center justify-center">
              <Phone className="size-4 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-charcoal leading-tight">
                Sales Roleplay Session
              </h3>
              <p className="text-[11px] text-warm-gray">
                {persona.name} · {persona.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConnected && (
              <div className="flex items-center gap-2 bg-cream px-3 py-1.5 rounded-full border border-border/40">
                <div
                  className={`size-2 rounded-full ${personaLeft ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`}
                />
                <span className="text-xs text-charcoal font-medium font-mono">
                  {formatTime(callDuration)}
                </span>
              </div>
            )}
            <div className="flex items-center -space-x-2">
              <div className="size-8 rounded-full bg-cream border-2 border-white flex items-center justify-center text-[10px] font-bold text-charcoal shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="size-8 rounded-full bg-cream border-2 border-white flex items-center justify-center text-[10px] font-bold text-charcoal shadow-sm">
                {persona.name.charAt(0)}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-3 px-3 pb-3 min-h-0">
          {/* Left: Stage + Controls */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Main Speaker Stage */}
            <div className="flex-1 bg-cream/40 border border-border/40 rounded-2xl relative flex items-center justify-center overflow-hidden">
              {/* "You" label top-left */}
              {isConnected && !personaLeft && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <div className="size-8 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold text-charcoal border border-border/40">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-charcoal font-medium">
                    {displayName}
                  </span>
                </div>
              )}

              {/* Pre-call idle state */}
              {!isConnected && !isConnecting && !personaLeft && (
                <div className="flex flex-col items-center justify-center text-center p-6 z-10">
                  <div className="size-24 sm:size-32 rounded-full bg-white border border-border/60 flex items-center justify-center text-5xl font-bold text-charcoal mb-4 shadow-sm">
                    {persona.name.charAt(0)}
                  </div>
                  <h3 className="text-charcoal text-lg font-semibold mb-1">
                    Ready to start
                  </h3>
                  <p className="text-warm-gray text-sm max-w-[280px]">
                    Start the call to begin your sales roleplay with{" "}
                    {persona.name}.
                  </p>
                </div>
              )}

              {/* Connecting state */}
              {isConnecting && (
                <div className="flex flex-col items-center justify-center text-center p-6 z-10">
                  <div className="size-24 sm:size-32 rounded-full bg-white border border-border/60 flex items-center justify-center mb-4 relative shadow-sm">
                    <Loader2 className="size-10 text-charcoal animate-spin" />
                    <div className="absolute inset-0 rounded-full border-2 border-charcoal/10 animate-pulse-ring" />
                  </div>
                  <h3 className="text-charcoal text-lg font-semibold mb-1">
                    Connecting...
                  </h3>
                  <p className="text-warm-gray text-sm">
                    Setting up your call with {persona.name}
                  </p>
                </div>
              )}

              {/* Live call: persona avatar with visualizer */}
              {isConnected && !personaLeft && (
                <div className="flex flex-col items-center justify-center z-10">
                  <div className="size-28 sm:size-36 rounded-full bg-white border border-border/60 flex items-center justify-center text-5xl font-bold text-charcoal relative shadow-md">
                    {persona.name.charAt(0)}
                    <div className="absolute inset-[-15%] rounded-full border-2 border-charcoal/10 animate-pulse-ring" />
                  </div>
                  {/* Audio visualizer */}
                  <div className="flex items-end gap-1.5 h-8 mt-5">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-charcoal/40 rounded-full animate-sound-wave"
                        style={{
                          animationDelay: `${i * 0.12}s`,
                          height: "4px",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Persona left state */}
              {personaLeft && (
                <div className="flex flex-col items-center justify-center text-center p-6 z-10">
                  <div className="size-24 rounded-full bg-white border border-border/60 flex items-center justify-center mb-4 shadow-sm">
                    <UserX className="size-10 text-charcoal/40" />
                  </div>
                  <h3 className="text-charcoal text-lg font-semibold mb-1">
                    {persona.name} left
                  </h3>
                  <p className="text-warm-gray text-sm max-w-[260px]">
                    The buyer has ended the meeting. End the call to see your
                    review.
                  </p>
                </div>
              )}

              {/* Participant name badge bottom-left */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-border/40 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                <span className="text-sm font-medium text-charcoal">
                  {persona.name}
                </span>
                {personaLeft ? (
                  <MicOff className="size-3.5 text-rose-600" />
                ) : (
                  <Mic className="size-3.5 text-charcoal/60" />
                )}
              </div>
            </div>

            {/* Floating Call Controls */}
            <div className="flex items-center justify-center gap-3 py-2 shrink-0">
              {/* Mic toggle */}
              <button className="size-11 rounded-full bg-white border border-border/40 hover:bg-cream flex items-center justify-center text-charcoal transition-colors shadow-sm">
                {isConnected ? (
                  <Mic className="size-5" />
                ) : (
                  <MicOff className="size-5 text-warm-gray" />
                )}
              </button>

              {/* Log Insight Button */}
              {isConnected && !personaLeft && (
                <button
                  onClick={logManualInsight}
                  title="Log Sales Insight"
                  className="size-11 rounded-full bg-white border border-border/40 hover:bg-cream flex items-center justify-center text-amber-500 transition-colors shadow-sm"
                >
                  <Lightbulb className="size-5" />
                </button>
              )}

              {/* Start / End Call */}
              {!isConnected && !isConnecting && !personaLeft ? (
                <button
                  onClick={connect}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-all duration-200 group"
                >
                  <Phone className="size-4" />
                  <span className="text-sm">Start Call</span>
                </button>
              ) : (
                <button
                  onClick={handleEndCall}
                  className="size-11 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white transition-colors shadow-lg shadow-rose-500/20"
                >
                  <PhoneOff className="size-5" />
                </button>
              )}
            </div>

            {/* Bottom Participant Strip */}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:flex w-[320px] xl:w-[360px] flex-col gap-3 shrink-0">
            {/* Meeting Overview Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm shrink-0">
              <h3 className="font-semibold text-charcoal text-lg mb-2">
                Meeting overview
              </h3>
              <p className="text-xs text-warm-gray leading-relaxed mb-4">
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
                <div className="flex-1 bg-cream rounded-xl px-3 py-2 text-center">
                  <p className="text-[10px] text-warm-gray uppercase tracking-wider mb-0.5">
                    Intensity
                  </p>
                  <p className="text-sm font-semibold text-charcoal">
                    {persona.intensityLevel}/3
                  </p>
                </div>
                <div className="flex-1 bg-cream rounded-xl px-3 py-2 text-center">
                  <p className="text-[10px] text-warm-gray uppercase tracking-wider mb-0.5">
                    Duration
                  </p>
                  <p className="text-sm font-semibold text-charcoal font-mono">
                    {formatTime(callDuration)}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat / Transcript */}
            <div className="px-2 py-2 border-b border-border/40 flex items-center gap-1 shrink-0 bg-cream/20">
              <button
                onClick={() => setSidebarTab("chat")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  sidebarTab === "chat"
                    ? "bg-white text-charcoal shadow-sm border border-border/40"
                    : "text-warm-gray hover:text-charcoal"
                }`}
              >
                <MessageSquare className="size-3.5" />
                Chat
              </button>
              <button
                onClick={() => setSidebarTab("insights")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  sidebarTab === "insights"
                    ? "bg-white text-charcoal shadow-sm border border-border/40"
                    : "text-warm-gray hover:text-charcoal"
                }`}
              >
                <Zap className="size-3.5" />
                Insights
                {insights.length > 0 && (
                  <span className="flex size-4 items-center justify-center bg-amber-500 text-[9px] text-white rounded-full">
                    {insights.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {sidebarTab === "chat" ? (
                <div className="space-y-4">
                  {transcript.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <div className="size-10 rounded-full bg-cream flex items-center justify-center mb-3">
                        <MessageSquare className="size-4 text-warm-gray" />
                      </div>
                      <p className="text-xs text-warm-gray max-w-[180px]">
                        {isConnected
                          ? "Listening... conversation will appear here."
                          : "Start the call to see the live transcript."}
                      </p>
                    </div>
                  ) : (
                    transcript.map((entry, i) => (
                      <div
                        key={i}
                        className={`flex gap-2.5 animate-fade-up ${
                          entry.role === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                        style={{
                          animationDelay: `${Math.min(i * 50, 200)}ms`,
                        }}
                      >
                        <div
                          className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
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
                              ? "bg-charcoal text-white rounded-tr-sm"
                              : "bg-cream/80 text-charcoal rounded-tl-sm"
                          }`}
                        >
                          <p
                            className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${entry.role === "user" ? "text-white/50" : "text-warm-gray"}`}
                          >
                            {entry.role === "user" ? displayName : persona.name}
                          </p>
                          <p className="leading-relaxed">{entry.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <div className="size-10 rounded-full bg-cream flex items-center justify-center mb-3">
                        <Zap className="size-4 text-warm-gray" />
                      </div>
                      <p className="text-xs text-warm-gray max-w-[180px]">
                        No insights logged yet. The AI will log key moments, or
                        you can click the lightbulb to save a moment.
                      </p>
                    </div>
                  ) : (
                    insights.map((insight, i) => (
                      <div
                        key={i}
                        className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 animate-fade-up"
                        style={{
                          animationDelay: `${Math.min(i * 50, 200)}ms`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                            Sales Insight
                          </span>
                          <span className="text-[10px] font-mono text-warm-gray">
                            {formatTime(insight.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal leading-relaxed pr-2">
                          {insight.insight}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div ref={transcriptEndRef} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
