"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Target,
  Shield,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Clock,
  RotateCcw,
  Download,
  Headphones,
} from "lucide-react";
import type { Session, Persona, Product } from "@/lib/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ObjectionHeatmap } from "./objection-heatmap";

interface SessionResultsProps {
  session: Session;
  persona?: Persona | null;
  product: Product | null;
  onBack: () => void;
}

function ScoreIndicator({
  score,
  label,
  icon: Icon,
  variant = "default",
}: {
  score: number;
  label: string;
  icon: React.ElementType;
  variant?: "default" | "secondary" | "outline";
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative flex items-center justify-center">
        {/* Simple Progress Circle */}
        <svg className="size-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={264}
            strokeDashoffset={264 - (264 * score) / 10}
            className={cn(
              "transition-all duration-1000 ease-out",
              score >= 7
                ? "text-charcoal"
                : score >= 4
                  ? "text-warm-gray"
                  : "text-warm-gray-light",
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span className="text-charcoal text-2xl font-bold">{score}</span>
          <span className="text-warm-gray text-[10px] font-medium tracking-tighter uppercase">
            out of 10
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Icon className="text-warm-gray size-4" />
        <span className="text-charcoal text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}

export function SessionResults({
  session,
  persona,
  product,
  onBack,
}: SessionResultsProps) {
  const evaluation = session.evaluation;

  const overallScore = evaluation
    ? Math.round(
        (evaluation.objectionHandlingScore +
          evaluation.confidenceScore +
          evaluation.clarityScore) /
          3,
      )
    : 0;

  const [audioUrl, setAudioUrl] = useState<string | null>(
    session.audioUrl || null,
  );

  useEffect(() => {
    if (session.audioUrl) {
      setAudioUrl(session.audioUrl);
    }
  }, [session.audioUrl]);

  const handleDownloadTranscript = () => {
    const blob = new Blob([session.transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${session.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `session-recording-${session.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSeek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play();
    }
  };

  return (
    <div className="animate-fade-up mx-auto max-w-5xl space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-warm-gray hover:text-charcoal -ml-2 w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
        <Button
          onClick={onBack}
          className="bg-charcoal text-cream hover:bg-charcoal/90 rounded-full px-6"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          New Roleplay Session
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Summary & Scores */}
        <div className="space-y-8 lg:col-span-7">
          {/* Main Completion Card */}
          <Card className="border-border/60 overflow-hidden pt-0 shadow-sm">
            <div className="bg-charcoal text-cream p-8 pb-12 text-center">
              <Badge
                variant="outline"
                className="mb-6 border-white/20 bg-white/5 px-4 py-1 text-white/60"
              >
                SESSION COMPLETED
              </Badge>
              <div className="mb-4 flex flex-col items-center">
                <span className="mb-2 text-[0.65rem] font-bold tracking-[0.2em] text-white/40 uppercase">
                  Overall Performance
                </span>
                <div className="heading-serif flex items-baseline justify-center">
                  <span className="text-7xl font-bold">{overallScore}</span>
                  <span className="ml-1 text-2xl opacity-40">/10</span>
                </div>
              </div>
              <p className="text-cream/70 mx-auto max-w-sm text-sm leading-relaxed">
                {overallScore >= 8
                  ? "Excellent performance! You handled this call like a seasoned professional."
                  : overallScore >= 6
                    ? "Good job! You demonstrated strong core skills with some areas for refinement."
                    : "A solid first attempt. Focus on the specific feedback below to level up your game."}
              </p>
            </div>

            <CardContent className="-mt-6 rounded-t-3xl bg-white p-8">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                <ScoreIndicator
                  score={evaluation?.objectionHandlingScore || 0}
                  label="Objection Handling"
                  icon={Target}
                />
                <ScoreIndicator
                  score={evaluation?.confidenceScore || 0}
                  label="Confidence"
                  icon={Shield}
                />
                <ScoreIndicator
                  score={evaluation?.clarityScore || 0}
                  label="Clarity"
                  icon={Eye}
                />
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="border-border/60 bg-cream/30 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <ThumbsUp className="size-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-charcoal text-sm font-bold">
                    Strengths
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {evaluation?.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="text-warm-gray flex items-start gap-2.5 text-sm leading-relaxed"
                    >
                      <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-warm-gray-light/5 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10">
                    <ThumbsDown className="size-4 text-rose-600" />
                  </div>
                  <CardTitle className="text-charcoal text-sm font-bold">
                    To Improve
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {evaluation?.weaknesses.map((w, i) => (
                    <li
                      key={i}
                      className="text-warm-gray flex items-start gap-2.5 text-sm leading-relaxed"
                    >
                      <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" />
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Pro Tips */}
          <Card className="border-border/60 overflow-hidden shadow-none">
            <CardHeader className="bg-amber-500/5 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Lightbulb className="size-4 text-amber-600" />
                </div>
                <CardTitle className="text-charcoal text-sm font-bold">
                  Coaching & Pro-Tips
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {evaluation?.improvementTips.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4"
                  >
                    <p className="text-warm-gray text-sm leading-relaxed italic">
                      &quot;{t}&quot;
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Session Details & Transcript */}
        <div className="space-y-6 lg:col-span-5">
          {/* Metadata Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-cream flex items-center gap-4 rounded-2xl p-4">
                <div className="bg-charcoal text-cream flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xl font-bold">
                  {persona?.avatarUrl || session.personaAvatarUrl ? (
                    <img
                      src={persona?.avatarUrl || session.personaAvatarUrl}
                      alt={persona?.name || session.personaName || "Persona"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    persona?.name.charAt(0) ||
                    session.personaName?.charAt(0) ||
                    "?"
                  )}
                </div>
                <div>
                  <h4 className="text-charcoal font-bold">
                    {persona?.name || session.personaName || "Unknown"}
                  </h4>
                  <p className="text-warm-gray text-xs">
                    {persona?.role || session.personaRole || "AI Persona"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-warm-gray text-[10px] font-bold tracking-widest uppercase">
                    Duration
                  </span>
                  <div className="text-charcoal flex items-center gap-2 font-semibold">
                    <Clock className="size-4 opacity-50" />
                    {Math.floor(session.durationSeconds / 60)}m{" "}
                    {session.durationSeconds % 60}s
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-warm-gray text-[10px] font-bold tracking-widest uppercase">
                    Product
                  </span>
                  <div className="text-charcoal truncate font-semibold">
                    {product?.companyName || "N/A"}
                  </div>
                </div>
              </div>

              {audioUrl && (
                <div className="border-border/40 border-t pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h5 className="text-warm-gray flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
                      <Headphones className="size-3.5" />
                      Recording
                    </h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadAudio}
                      className="h-7 px-2 text-xs"
                    >
                      <Download className="mr-1.5 h-3 w-3" /> Download
                    </Button>
                  </div>
                  <div className="mb-8 rounded-2xl bg-white/50 p-1">
                    <ObjectionHeatmap
                      insights={session.insights || []}
                      durationSeconds={session.durationSeconds}
                      onSeek={handleSeek}
                    />
                  </div>

                  <audio
                    ref={audioRef}
                    controls
                    src={audioUrl}
                    className="accent-charcoal h-10 w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcript Area */}
          <Card className="border-border/60 flex h-[500px] flex-col shadow-sm">
            <CardHeader className="flex shrink-0 flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold">
                  Full Transcript
                </CardTitle>
                <CardDescription className="text-xs">
                  Recorded during session
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTranscript}
                className="h-8 text-xs"
              >
                <Download className="mr-1.5 h-3 w-3" /> Export
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 px-2 pt-0 pb-2">
              <ScrollArea className="h-full px-4 pt-4">
                <div className="space-y-6">
                  {session.transcript.split("\n\n").map((line, i) => {
                    const colonIndex = line.indexOf(": ");
                    const speaker =
                      colonIndex !== -1 ? line.substring(0, colonIndex) : "";
                    const text =
                      colonIndex !== -1 ? line.substring(colonIndex + 2) : line;
                    const isUser =
                      speaker === session.userName || speaker === "Sales Rep";

                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-3",
                          isUser ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold",
                            isUser
                              ? "bg-charcoal text-cream border-charcoal/20"
                              : "text-charcoal border-border/60 bg-white",
                          )}
                        >
                          {speaker.charAt(0).toUpperCase()}
                        </div>
                        <div
                          className={cn(
                            "max-w-[85%]",
                            isUser ? "text-right" : "text-left",
                          )}
                        >
                          <p className="text-warm-gray mb-1 px-1 text-[9px] font-bold tracking-widest uppercase">
                            {speaker}
                          </p>
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                              isUser
                                ? "bg-charcoal text-cream rounded-tr-none"
                                : "bg-cream/40 text-charcoal border-border/40 rounded-tl-none border",
                            )}
                          >
                            {text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
