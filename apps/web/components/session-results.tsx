"use client";

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
} from "lucide-react";
import type { Session, Persona, Product } from "@/lib/db";

interface SessionResultsProps {
  session: Session;
  persona: Persona;
  product: Product | null;
  onBack: () => void;
}

function ScoreRing({
  score,
  label,
  icon: Icon,
  color,
}: {
  score: number;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (circumference * score) / 10;

  const colorMap: Record<string, { stroke: string; text: string; bg: string }> =
    {
      charcoal: {
        stroke: "#1A1A1A",
        text: "text-charcoal",
        bg: "bg-charcoal/10",
      },
      warm: {
        stroke: "#8A8578",
        text: "text-warm-gray",
        bg: "bg-warm-gray/10",
      },
      light: {
        stroke: "#B5AFA5",
        text: "text-warm-gray-light",
        bg: "bg-warm-gray-light/20",
      },
    };

  const c = colorMap[color] || colorMap.charcoal;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-28">
        <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--color-cream-dark)"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={c.stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${c.text}`}>{score}</span>
          <span className="text-xs text-warm-gray">/10</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className={`size-6 rounded-md ${c.bg} flex items-center justify-center`}
        >
          <Icon className={`size-3.5 ${c.text}`} />
        </div>
        <span className="text-sm font-medium text-charcoal">{label}</span>
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

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-warm-gray hover:text-charcoal transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream-dark text-charcoal text-sm font-medium hover:bg-charcoal hover:text-cream transition-colors"
        >
          <RotateCcw className="size-4" />
          New Session
        </button>
      </div>

      {/* Session Meta */}
      <div className="bg-white rounded-2xl border border-border/60 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-charcoal flex items-center justify-center text-xl font-bold text-cream">
              {persona.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-charcoal heading-serif">
                Session <em>Complete.</em>
              </h2>
              <p className="text-sm text-warm-gray">
                Call with {persona.name} ({persona.role})
                {product && ` • ${product.companyName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-warm-gray">
            <Clock className="size-4" />
            <span className="font-mono">
              {Math.floor(session.durationSeconds / 60)}m{" "}
              {session.durationSeconds % 60}s
            </span>
          </div>
        </div>
      </div>

      {evaluation ? (
        <>
          {/* Overall Score */}
          <div className="bg-white rounded-2xl border border-border/60 p-10 text-center">
            <p className="text-xs text-warm-gray mb-2 uppercase tracking-widest font-medium">
              Overall Score
            </p>
            <div className="heading-serif text-6xl mb-1">
              <span className="text-charcoal">{overallScore}</span>
              <span className="text-2xl text-warm-gray">/10</span>
            </div>
            <p className="text-sm text-warm-gray">
              {overallScore >= 8
                ? "Excellent performance! You handled this call like a pro."
                : overallScore >= 6
                  ? "Good job! There's room for improvement on key areas."
                  : overallScore >= 4
                    ? "Decent effort. Focus on the tips below to level up."
                    : "This was a tough call. Use the feedback to improve."}
            </p>
          </div>

          {/* Score Rings */}
          <div className="bg-white rounded-2xl border border-border/60 p-10">
            <div className="flex flex-wrap items-center justify-around gap-8">
              <ScoreRing
                score={evaluation.objectionHandlingScore}
                label="Objection Handling"
                icon={Target}
                color="charcoal"
              />
              <ScoreRing
                score={evaluation.confidenceScore}
                label="Confidence"
                icon={Shield}
                color="warm"
              />
              <ScoreRing
                score={evaluation.clarityScore}
                label="Clarity"
                icon={Eye}
                color="light"
              />
            </div>
          </div>

          {/* Real-time Sales Insights */}
          {session.insights && session.insights.length > 0 && (
            <div className="bg-white rounded-2xl border border-border/60 p-6">
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <span className="size-2 rounded-full bg-cream-dark" />
                Real-time Sales Insights
              </h3>
              <div className="space-y-3">
                {session.insights.map((insight, i) => (
                  <div
                    key={i}
                    className="flex gap-4 items-start p-3 rounded-xl bg-warm-gray-light/5 border border-warm-gray-light/10"
                  >
                    <div className="text-xs font-mono text-warm-gray pt-1 shrink-0">
                      {Math.floor(insight.timestamp / 60)}:
                      {(insight.timestamp % 60).toString().padStart(2, "0")}
                    </div>
                    <div className="text-sm text-charcoal leading-relaxed">
                      {insight.insight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Strengths */}
            <div className="bg-white rounded-2xl border border-border/60 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-lg bg-charcoal/10 flex items-center justify-center">
                  <ThumbsUp className="size-4 text-charcoal" />
                </div>
                <h3 className="font-semibold text-sm text-charcoal">
                  Strengths
                </h3>
              </div>
              <ul className="space-y-2.5">
                {evaluation.strengths.map((s: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-warm-gray flex items-start gap-2"
                  >
                    <span className="size-1.5 rounded-full bg-charcoal mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-white rounded-2xl border border-border/60 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-lg bg-warm-gray/10 flex items-center justify-center">
                  <ThumbsDown className="size-4 text-warm-gray" />
                </div>
                <h3 className="font-semibold text-sm text-charcoal">
                  Areas to Improve
                </h3>
              </div>
              <ul className="space-y-2.5">
                {evaluation.weaknesses.map((w: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-warm-gray flex items-start gap-2"
                  >
                    <span className="size-1.5 rounded-full bg-warm-gray mt-1.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-2xl border border-border/60 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-lg bg-cream-dark flex items-center justify-center">
                  <Lightbulb className="size-4 text-warm-gray" />
                </div>
                <h3 className="font-semibold text-sm text-charcoal">
                  Pro Tips
                </h3>
              </div>
              <ul className="space-y-2.5">
                {evaluation.improvementTips.map((t: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-warm-gray flex items-start gap-2"
                  >
                    <span className="size-1.5 rounded-full bg-warm-gray-light mt-1.5 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-border/60 p-10 text-center">
          <p className="text-warm-gray">
            Evaluation could not be generated for this session.
          </p>
        </div>
      )}

      {/* Transcript */}
      <div className="bg-white rounded-2xl border border-border/60 p-6">
        <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
          <span className="size-2 rounded-full bg-charcoal" />
          Full Transcript
        </h3>
        <div className="max-h-[500px] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
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
                className={`flex gap-4 ${isUser ? "flex-row-reverse text-right" : "flex-row text-left"}`}
              >
                {/* Avatar */}
                <div
                  className={`size-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border ${
                    isUser
                      ? "bg-charcoal text-cream border-charcoal/20"
                      : "bg-white text-charcoal border-border/60"
                  }`}
                >
                  {speaker.charAt(0).toUpperCase()}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[80%] space-y-1 ${isUser ? "items-end" : "items-start"}`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-warm-gray px-1">
                    {speaker}
                  </p>
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm border ${
                      isUser
                        ? "bg-charcoal text-cream border-charcoal/80 rounded-tr-none"
                        : "bg-white text-charcoal border-border/60 rounded-tl-none"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
