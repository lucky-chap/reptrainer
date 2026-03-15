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
  Trash2,
  Download,
  Headphones,
  Zap,
  Loader2,
  Sparkles,
  Search,
  Handshake,
  Ear,
} from "lucide-react";
import type { Session, Persona } from "@/lib/db";
import {
  updateCallSession,
  uploadDebriefAudio,
  deleteDebriefAudio,
  uploadDebriefVisuals,
  deleteDebriefVisuals,
} from "@/lib/db";
import { CoachDebrief } from "./coach-debrief";
import { generateCoachDebrief } from "@/app/actions/api";
import type { CoachDebriefResponse } from "@reptrainer/shared";
import { calculateSessionMetrics } from "@/lib/analytics/standardizer";
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
import { getOverallScore } from "@/lib/analytics-utils";
import { ObjectionHeatmap } from "./objection-heatmap";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionResultsProps {
  session: Session;
  persona?: Persona | null;
  productCategory?: string | null;
  onBack: () => void;
}

function ScoreIndicator({
  score,
  label,
  explanation,
  icon: Icon,
}: {
  score: number;
  label: string;
  explanation?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="relative flex items-center justify-center">
        {/* Simple Progress Circle */}
        <svg className="size-20 -rotate-90" viewBox="0 0 100 100">
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
            strokeDashoffset={264 - (264 * score) / 100}
            className={cn(
              "transition-all duration-1000 ease-out",
              score >= 70
                ? "text-charcoal"
                : score >= 40
                  ? "text-warm-gray"
                  : "text-warm-gray-light",
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span className="text-charcoal text-xl font-bold">{score}</span>
          <span className="text-warm-gray text-[8px] font-medium tracking-tighter uppercase">
            Points
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="justify- flex items-center gap-1.5 text-left">
          <Icon className="text-warm-gray size-3.5" />
          <span className="text-charcoal text-xs leading-tight font-bold">
            {label}
          </span>
        </div>
        {explanation && (
          <p className="text-warm-gray text-left leading-relaxed">
            {explanation}
          </p>
        )}
      </div>
    </div>
  );
}

export function SessionResults({
  session,
  persona,
  productCategory,
  onBack,
}: SessionResultsProps) {
  const [debriefData, setDebriefData] = useState<CoachDebriefResponse | null>(
    session.debrief || null,
  );
  const [generatingDebrief, setGeneratingDebrief] = useState(false);
  const [isPersistingDebrief, setIsPersistingDebrief] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [isDeletingDebrief, setIsDeletingDebrief] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleGenerateDebrief = async () => {
    if (generatingDebrief || isPersistingDebrief) return;
    setGeneratingDebrief(true);
    try {
      console.log("[SessionResults] Generating on-demand coach debrief...");
      const debrief = await generateCoachDebrief({
        transcript: session.transcript,
        personaName: persona?.name || session.personaName || "Unknown",
        personaRole: persona?.role || session.personaRole || "AI Persona",
        durationSeconds: session.durationSeconds,
        objections: (session as any).objections || [],
        moods: (session as any).moods || [],
      });

      // Update local state immediately with base64 for instant preview if needed
      // but we'll wait for persistence before showing the "View" button fully if we want
      setDebriefData(debrief);

      setIsPersistingDebrief(true);
      try {
        console.log(
          "[SessionResults] Uploading debrief assets to Firebase Storage...",
        );
        const [audioUrls, visualUrls] = await Promise.all([
          uploadDebriefAudio(
            session.userId,
            session.id,
            debrief.audioBase64 || [],
          ),
          uploadDebriefVisuals(
            session.userId,
            session.id,
            debrief.slides.map((s) => s.visualBase64 || ""),
          ),
        ]);

        // Prepare optimized debrief (no base64, just urls)
        const optimizedDebrief: CoachDebriefResponse = {
          ...debrief,
          audioUrls,
          visualUrls: visualUrls || [],
          audioBase64: [], // Clear out base64 to save Firestore space
          visualBase64: [], // Clear out base64
          slides: debrief.slides.map((slide, index) => {
            const { visualBase64: _vb64, ...rest } = slide;
            return {
              ...rest,
              visualUrl: visualUrls?.[index] || slide.visualUrl || "",
            };
          }),
        };

        // Update local state with URLs
        setDebriefData(optimizedDebrief);

        // Persist to Firestore
        console.log(
          "[SessionResults] Persisting optimized debrief to Firestore...",
        );
        await updateCallSession(session.id, { debrief: optimizedDebrief });
      } finally {
        setIsPersistingDebrief(false);
      }

      setShowDebrief(true);
    } catch (error) {
      console.error("Failed to generate on-demand debrief:", error);
    } finally {
      setGeneratingDebrief(false);
    }
  };

  const handleDeleteDebrief = async () => {
    if (!debriefData || isDeletingDebrief) return;
    setIsDeletingDebrief(true);
    try {
      const updatedSession = { ...session };
      // Remove debrief internally
      delete updatedSession.debrief;

      await Promise.all([
        deleteDebriefAudio(
          session.userId,
          session.id,
          debriefData.slides.length,
        ),
        deleteDebriefVisuals(
          session.userId,
          session.id,
          debriefData.slides.length,
        ),
        updateCallSession(session.id, {
          debrief: null as any,
        }),
      ]);
      setDebriefData(null);
    } finally {
      setIsDeletingDebrief(false);
      setShowDeleteConfirm(false);
    }
  };

  const sessionMetrics = calculateSessionMetrics(session);
  const overallScore = sessionMetrics.overall;
  const evaluation = session.evaluation as any;

  const [audioUrl, setAudioUrl] = useState<string | null>(
    session.audioUrl || null,
  );

  useEffect(() => {
    if (session.audioUrl) {
      setAudioUrl(session.audioUrl);
    }
  }, [session.audioUrl]);

  useEffect(() => {
    if (session.debrief) {
      setDebriefData(session.debrief);
    }
  }, [session.debrief]);

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

  if (showDebrief && debriefData) {
    return (
      <CoachDebrief
        slides={debriefData.slides}
        audioBase64={debriefData.audioBase64 || []}
        audioUrls={debriefData.audioUrls || []}
        onClose={() => setShowDebrief(false)}
      />
    );
  }

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
          className="bg-charcoal text-cream hover:bg-charcoal/90 h-12 rounded-full px-6"
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
                  <span className="ml-1 text-2xl opacity-40">/100</span>
                </div>
              </div>
              <p className="text-cream/70 mx-auto max-w-sm text-sm leading-relaxed">
                {overallScore >= 80
                  ? "Excellent performance! You handled this call like a seasoned professional."
                  : overallScore >= 60
                    ? "Good job! You demonstrated strong core skills with some areas for refinement."
                    : "A solid first attempt. Focus on the specific feedback below to level up your game."}
              </p>
            </div>

            <CardContent className="-mt-6 rounded-t-3xl bg-white p-8">
              <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-1">
                <ScoreIndicator
                  score={sessionMetrics.discovery}
                  label="Discovery"
                  explanation={evaluation?.discovery?.explanation}
                  icon={Search}
                />
                <ScoreIndicator
                  score={sessionMetrics.objection_handling}
                  label="Objections"
                  explanation={evaluation?.objectionHandling?.explanation}
                  icon={Shield}
                />
                <ScoreIndicator
                  score={sessionMetrics.positioning}
                  label="Positioning"
                  explanation={evaluation?.productPositioning?.explanation}
                  icon={Target}
                />
                <ScoreIndicator
                  score={sessionMetrics.listening}
                  label="Listening"
                  explanation={evaluation?.activeListening?.explanation}
                  icon={Ear}
                />
                <ScoreIndicator
                  score={sessionMetrics.closing}
                  label="Closing"
                  explanation={evaluation?.closing?.explanation}
                  icon={Handshake}
                />
                <ScoreIndicator
                  score={sessionMetrics.confidence}
                  label="Confidence"
                  explanation="Overall delivery confidence"
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
                  {evaluation?.strengths.map((s: string, i: number) => (
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
                  {evaluation?.weaknesses.map((w: string, i: number) => (
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
          <Card className="border-border/60 overflow-hidden pt-0 shadow-none">
            <CardHeader className="bg-amber-500/5 py-4">
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
                {evaluation?.improvementTips.map((t: string, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4"
                  >
                    <p className="text-warm-gray text-sm leading-relaxed italic">
                      {t}
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
                <div className="bg-charcoal text-cream flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold">
                  {persona?.avatarUrl || session.personaAvatarUrl ? (
                    <Image
                      src={
                        (persona?.avatarUrl as string) ||
                        (session.personaAvatarUrl as string)
                      }
                      alt={persona?.name || session.personaName || "Persona"}
                      className="h-full w-full rounded-full object-cover"
                      width={48}
                      height={48}
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
                    Industry / Category
                  </span>
                  <div className="text-charcoal truncate font-semibold">
                    {productCategory || "General Coaching"}
                  </div>
                </div>
              </div>

              {audioUrl && (
                <div className="border-border/40 border-t pt-6">
                  <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center sm:gap-0">
                    <h5 className="text-warm-gray flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
                      <Headphones className="size-3.5" />
                      Recording
                    </h5>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadAudio}
                        className="h-8 px-3 text-xs"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    controls
                    src={audioUrl}
                    className="accent-charcoal h-10 w-full"
                  />
                </div>
              )}

              {/* Objection Heatmap Section */}
              <ObjectionHeatmap
                insights={session.insights || []}
                durationSeconds={session.durationSeconds}
                onSeek={handleSeek}
              />

              {/* Coach Debrief Section */}
              <div className="border-border/40 border-t pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h5 className="text-warm-gray flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
                    <Sparkles className="size-3.5 text-amber-500" />
                    Coach Debrief
                  </h5>
                  {debriefData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isDeletingDebrief || isPersistingDebrief}
                      onClick={() => setShowDeleteConfirm(true)}
                      className="h-7 px-2 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      {isDeletingDebrief ? (
                        <>
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-1.5 h-3 w-3" />
                          Delete
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {debriefData ? (
                  <Button
                    onClick={() => setShowDebrief(true)}
                    disabled={isDeletingDebrief || isPersistingDebrief}
                    className="bg-charcoal text-cream hover:bg-charcoal/90 w-full rounded-xl py-6 disabled:opacity-50"
                  >
                    {isDeletingDebrief ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
                        Processing...
                      </>
                    ) : isPersistingDebrief ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
                        Persisting...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4 fill-amber-400 text-amber-400" />
                        View Coach Debrief
                      </>
                    )}
                  </Button>
                ) : session.durationSeconds >= 180 ? (
                  <Button
                    onClick={handleGenerateDebrief}
                    disabled={generatingDebrief}
                    variant="outline"
                    className="border-charcoal/20 hover:bg-charcoal/5 w-full rounded-xl py-6"
                  >
                    {generatingDebrief ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Debrief...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                        Generate Coach Debrief
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-warm-gray bg-warm-gray-light/5 rounded-xl border border-dashed p-4 text-center text-xs italic">
                    Debriefing is only available for sessions over 3 minutes.
                  </p>
                )}
              </div>
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
                  {(session.transcript || "").split("\n\n").map((line, i) => {
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
      {/* Deletion Confirmation */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => !open && setShowDeleteConfirm(false)}
      >
        <AlertDialogContent className="rounded-2xl border-none p-8 sm:max-w-[400px]">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-50">
              <Trash2 className="size-8 text-rose-600" />
            </div>
            <div className="space-y-2 text-center">
              <AlertDialogTitle className="heading-serif text-charcoal text-2xl">
                Delete <em>Debrief?</em>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-warm-gray/70 text-sm leading-relaxed font-medium">
                This will permanently remove the coach debrief and its
                associated audio files. This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AlertDialogCancel asChild>
              <Button
                variant="brandOutline"
                className="h-12 w-full rounded-xl sm:flex-1"
                disabled={isDeletingDebrief}
              >
                No, Keep it
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteDebrief();
                }}
                disabled={isDeletingDebrief}
                className="h-12 w-full rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-200 hover:bg-rose-700 sm:flex-1"
              >
                {isDeletingDebrief ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
