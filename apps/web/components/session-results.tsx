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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      emerald: {
        stroke: "oklch(0.72 0.17 162)",
        text: "text-emerald-glow",
        bg: "bg-emerald-glow/10",
      },
      blue: {
        stroke: "oklch(0.67 0.17 250)",
        text: "text-blue-glow",
        bg: "bg-blue-glow/10",
      },
      amber: {
        stroke: "oklch(0.79 0.16 75)",
        text: "text-amber-glow",
        bg: "bg-amber-glow/10",
      },
    };

  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-28">
        <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="oklch(0.22 0.01 260)"
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
          <span className="text-xs text-muted-foreground">/10</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className={`size-6 rounded-md ${c.bg} flex items-center justify-center`}
        >
          <Icon className={`size-3.5 ${c.text}`} />
        </div>
        <span className="text-sm font-medium">{label}</span>
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
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back to Personas
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          New Session
        </Button>
      </div>

      {/* Session Meta */}
      <Card className="p-5 glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-gradient-to-br from-violet-glow/20 to-blue-glow/10 border border-violet-glow/15 flex items-center justify-center text-xl font-bold text-violet-glow">
              {persona.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">Session Complete</h2>
              <p className="text-sm text-muted-foreground">
                Call with {persona.name} ({persona.role})
                {product && ` • ${product.companyName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span className="font-mono">
              {Math.floor(session.durationSeconds / 60)}m{" "}
              {session.durationSeconds % 60}s
            </span>
          </div>
        </div>
      </Card>

      {evaluation ? (
        <>
          {/* Overall Score */}
          <Card className="p-8 glass text-center">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">
              Overall Score
            </p>
            <div className="text-6xl font-bold mb-1">
              <span
                className={
                  overallScore >= 7
                    ? "text-emerald-glow"
                    : overallScore >= 4
                      ? "text-amber-glow"
                      : "text-rose-glow"
                }
              >
                {overallScore}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {overallScore >= 8
                ? "Excellent performance! You handled this call like a pro."
                : overallScore >= 6
                  ? "Good job! There's room for improvement on key areas."
                  : overallScore >= 4
                    ? "Decent effort. Focus on the tips below to level up."
                    : "This was a tough call. Use the feedback to improve."}
            </p>
          </Card>

          {/* Score Rings */}
          <Card className="p-8 glass">
            <div className="flex flex-wrap items-center justify-around gap-8">
              <ScoreRing
                score={evaluation.objectionHandlingScore}
                label="Objection Handling"
                icon={Target}
                color="emerald"
              />
              <ScoreRing
                score={evaluation.confidenceScore}
                label="Confidence"
                icon={Shield}
                color="blue"
              />
              <ScoreRing
                score={evaluation.clarityScore}
                label="Clarity"
                icon={Eye}
                color="amber"
              />
            </div>
          </Card>

          {/* Feedback */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Strengths */}
            <Card className="p-5 glass">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-lg bg-emerald-glow/10 flex items-center justify-center">
                  <ThumbsUp className="size-4 text-emerald-glow" />
                </div>
                <h3 className="font-semibold text-sm">Strengths</h3>
              </div>
              <ul className="space-y-2.5">
                {evaluation.strengths.map((s: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-glow mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Weaknesses */}
            <Card className="p-5 glass">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-lg bg-rose-glow/10 flex items-center justify-center">
                  <ThumbsDown className="size-4 text-rose-glow" />
                </div>
                <h3 className="font-semibold text-sm">Areas to Improve</h3>
              </div>
              <ul className="space-y-2.5">
                {evaluation.weaknesses.map((w: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="size-1.5 rounded-full bg-rose-glow mt-1.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Tips */}
            <Card className="p-5 glass">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-lg bg-amber-glow/10 flex items-center justify-center">
                  <Lightbulb className="size-4 text-amber-glow" />
                </div>
                <h3 className="font-semibold text-sm">Pro Tips</h3>
              </div>
              <ul className="space-y-2.5">
                {evaluation.improvementTips.map((t: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="size-1.5 rounded-full bg-amber-glow mt-1.5 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-8 glass text-center">
          <p className="text-muted-foreground">
            Evaluation could not be generated for this session.
          </p>
        </Card>
      )}

      {/* Transcript */}
      <Card className="p-5 glass">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span className="size-2 rounded-full bg-muted-foreground" />
          Full Transcript
        </h3>
        <div className="max-h-[400px] overflow-y-auto space-y-3">
          {session.transcript.split("\n\n").map((line, i) => {
            const isRep = line.startsWith("Sales Rep:");
            return (
              <div
                key={i}
                className={`text-sm rounded-lg px-3 py-2 ${
                  isRep
                    ? "bg-emerald-glow/5 border-l-2 border-emerald-glow/30"
                    : "bg-secondary/40 border-l-2 border-violet-glow/30"
                }`}
              >
                {line}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
