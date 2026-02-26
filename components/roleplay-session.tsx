"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Clock,
  Radio,
  MessageSquare,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGeminiLive } from "@/hooks/use-gemini-live";
import type { Product, Persona, Session } from "@/lib/db";
import { getProduct, saveSession } from "@/lib/db";
import { SessionResults } from "@/components/session-results";

interface RoleplaySessionProps {
  persona: Persona;
  onBack: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RoleplaySession({ persona, onBack }: RoleplaySessionProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [savedSession, setSavedSession] = useState<Session | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Build system prompt
  const systemPrompt = `You are playing the role of "${persona.name}", a ${persona.role}.

${persona.personalityPrompt}

Behavior Rules:
- Your intensity level is ${persona.intensityLevel}/3 (${["friendly skeptic", "tough negotiator", "hostile gatekeeper"][persona.intensityLevel - 1]}).
- Interruption frequency: ${persona.traits.interruptionFrequency}.
- Your objection style is: ${persona.traits.objectionStyle}.
- ${persona.objectionStrategy}

Additional behavior guidelines:
- Interrupt occasionally when the sales rep is rambling or giving vague answers.
- Push for ROI proof and concrete numbers.
- Raise pricing objections.
- If the rep avoids answering a question, repeat the objection with a stronger tone.
- Do not be easily convinced — make them earn it.
- Keep your responses concise but challenging.
- If the rep gives a truly compelling answer backed by evidence, you can acknowledge it but still probe further.
- You are evaluating "${product?.companyName || "a product"}" — ${product?.description || "a software product"}.

${product?.objections && product.objections.length > 0 ? `Key objections you should raise during the conversation:\n${product.objections.map((o, i) => `${i + 1}. ${o}`).join("\n")}` : ""}

Remember: You are the BUYER, not the sales rep. Start by introducing yourself and asking the rep to pitch their product to you.`;

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

  const {
    isConnected,
    isConnecting,
    transcript,
    connect,
    disconnect,
    getDuration,
  } = useGeminiLive({
    systemPrompt,
    onTranscriptUpdate: handleTranscriptUpdate,
    onError: handleError,
  });

  // Load product
  useEffect(() => {
    getProduct(persona.productId).then((p) => {
      if (p) setProduct(p);
    });
  }, [persona.productId]);

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

  const handleEndCall = async () => {
    const duration = getDuration();
    disconnect();

    // Build transcript text
    const transcriptText = transcript
      .map(
        (entry) =>
          `${entry.role === "user" ? "Sales Rep" : persona.name}: ${entry.text}`,
      )
      .join("\n\n");

    if (transcriptText.trim().length === 0) {
      onBack();
      return;
    }

    setEvaluating(true);

    try {
      // Evaluate
      const evalRes = await fetch("/api/session/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          personaName: persona.name,
          personaRole: persona.role,
          intensityLevel: persona.intensityLevel,
          durationSeconds: duration,
        }),
      });

      const evaluation = await evalRes.json();

      // Save session
      const session: Session = {
        id: uuidv4(),
        personaId: persona.id,
        productId: persona.productId,
        transcript: transcriptText,
        durationSeconds: duration,
        evaluation: evalRes.ok ? evaluation : null,
        createdAt: new Date().toISOString(),
      };

      await saveSession(session);
      setSavedSession(session);
      setShowResults(true);
    } catch (error) {
      console.error("Evaluation error:", error);
      const session: Session = {
        id: uuidv4(),
        personaId: persona.id,
        productId: persona.productId,
        transcript: transcriptText,
        durationSeconds: duration,
        evaluation: null,
        createdAt: new Date().toISOString(),
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

      {/* Persona Info Bar */}
      <Card className="p-4 glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-gradient-to-br from-violet-glow/20 to-blue-glow/10 border border-violet-glow/15 flex items-center justify-center text-xl font-bold text-violet-glow">
              {persona.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-base">{persona.name}</h3>
              <p className="text-xs text-muted-foreground">{persona.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="font-mono text-emerald-glow font-bold">
                    {formatTime(callDuration)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-emerald-glow animate-pulse" />
                  <span className="text-xs text-emerald-glow font-medium">
                    Live
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Call Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Controls */}
        <div className="lg:col-span-1">
          <Card className="p-6 glass flex flex-col items-center justify-center min-h-[300px]">
            {!isConnected && !isConnecting ? (
              <>
                <div className="relative mb-6">
                  <div className="size-24 rounded-full bg-gradient-to-br from-emerald-glow/20 to-emerald-glow/5 border-2 border-emerald-glow/20 flex items-center justify-center">
                    <Phone className="size-10 text-emerald-glow" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Ready to Dial In</h3>
                <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                  Start the call to begin your roleplay with {persona.name}.
                  Treat this like a real sales call.
                </p>
                <Button
                  onClick={connect}
                  size="lg"
                  className="gap-2 bg-emerald-glow hover:bg-emerald-glow/90 text-black font-semibold px-8"
                >
                  <Phone className="size-5" />
                  Start Call
                </Button>
              </>
            ) : isConnecting ? (
              <>
                <div className="relative mb-6">
                  <div className="size-24 rounded-full bg-gradient-to-br from-amber-glow/20 to-amber-glow/5 border-2 border-amber-glow/20 flex items-center justify-center">
                    <Radio className="size-10 text-amber-glow animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-amber-glow/30 animate-pulse-ring" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Connecting...</h3>
                <p className="text-sm text-muted-foreground">
                  Setting up your call with {persona.name}
                </p>
              </>
            ) : (
              <>
                {/* Live Call State */}
                <div className="relative mb-6">
                  <div className="size-24 rounded-full bg-gradient-to-br from-emerald-glow/20 to-emerald-glow/5 border-2 border-emerald-glow/30 flex items-center justify-center">
                    <Mic className="size-10 text-emerald-glow" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-glow/20 animate-pulse-ring" />
                </div>

                {/* Audio Visualizer */}
                <div className="flex items-end gap-1 h-6 mb-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-emerald-glow/60 rounded-full animate-sound-wave"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        height: "4px",
                      }}
                    />
                  ))}
                </div>

                <p className="text-sm text-emerald-glow font-medium mb-6">
                  Call in progress...
                </p>

                <Button
                  onClick={handleEndCall}
                  size="lg"
                  className="gap-2 bg-destructive hover:bg-destructive/90 text-white font-semibold px-8"
                >
                  <PhoneOff className="size-5" />
                  End Call
                </Button>
              </>
            )}
          </Card>
        </div>

        {/* Transcript Panel */}
        <div className="lg:col-span-2">
          <Card className="glass flex flex-col h-[500px]">
            <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Live Transcript</h3>
              {transcript.length > 0 && (
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {transcript.length} messages
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MicOff className="size-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {isConnected
                      ? "Listening... Start speaking to begin."
                      : "Start the call to see the conversation transcript here."}
                  </p>
                </div>
              ) : (
                transcript.map((entry, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 animate-fade-up ${
                      entry.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    style={{ animationDelay: `${Math.min(i * 50, 200)}ms` }}
                  >
                    {entry.role === "model" && (
                      <div className="size-8 rounded-full bg-gradient-to-br from-violet-glow/20 to-blue-glow/10 border border-violet-glow/15 flex items-center justify-center text-xs font-bold text-violet-glow shrink-0">
                        {persona.name.charAt(0)}
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                        entry.role === "user"
                          ? "bg-emerald-glow/10 text-emerald-glow border border-emerald-glow/15"
                          : "bg-secondary/80 text-foreground"
                      }`}
                    >
                      <p className="text-[11px] font-medium opacity-60 mb-0.5">
                        {entry.role === "user" ? "You" : persona.name}
                      </p>
                      {entry.text}
                    </div>
                    {entry.role === "user" && (
                      <div className="size-8 rounded-full bg-emerald-glow/15 border border-emerald-glow/15 flex items-center justify-center text-xs font-bold text-emerald-glow shrink-0">
                        You
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
