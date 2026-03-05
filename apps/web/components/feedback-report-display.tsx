"use client";

import {
  Trophy,
  Target,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  XCircle,
  ArrowLeft,
  BarChart3,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ObjectionHeatmap } from "./objection-heatmap";
import type { FeedbackReport } from "@reptrainer/shared";

interface FeedbackReportDisplayProps {
  report: FeedbackReport;
  personaName: string;
  durationSeconds: number;
  insights?: { insight: string; timestamp: number }[];
  onBack: () => void;
}

function ScoreRing({
  score,
  label,
  size = "lg",
}: {
  score: number;
  label: string;
  size?: "sm" | "lg";
}) {
  const radius = size === "lg" ? 54 : 32;
  const stroke = size === "lg" ? 8 : 5;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const viewBox = size === "lg" ? "0 0 128 128" : "0 0 76 76";
  const center = size === "lg" ? 64 : 38;

  const color =
    score >= 75
      ? "text-emerald-500"
      : score >= 50
        ? "text-amber-500"
        : "text-rose-500";

  const bgColor =
    score >= 75
      ? "stroke-emerald-500/15"
      : score >= 50
        ? "stroke-amber-500/15"
        : "stroke-rose-500/15";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          className={`-rotate-90 ${size === "lg" ? "size-32" : "size-[76px]"}`}
          viewBox={viewBox}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className={bgColor}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className={`${color} transition-all duration-1000 ease-out`}
            style={{ stroke: "currentColor" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-charcoal font-bold ${size === "lg" ? "text-3xl" : "text-lg"}`}
          >
            {score}
          </span>
        </div>
      </div>
      <span
        className={`text-warm-gray font-medium ${size === "lg" ? "text-sm" : "text-[11px]"}`}
      >
        {label}
      </span>
    </div>
  );
}

function FeedbackSection({
  icon: Icon,
  title,
  items,
  variant,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  variant: "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    success: {
      bg: "bg-emerald-50/80",
      border: "border-emerald-200/60",
      icon: "text-emerald-600",
      bullet: "bg-emerald-500",
    },
    warning: {
      bg: "bg-amber-50/80",
      border: "border-amber-200/60",
      icon: "text-amber-600",
      bullet: "bg-amber-500",
    },
    danger: {
      bg: "bg-rose-50/80",
      border: "border-rose-200/60",
      icon: "text-rose-600",
      bullet: "bg-rose-500",
    },
    info: {
      bg: "bg-sky-50/80",
      border: "border-sky-200/60",
      icon: "text-sky-600",
      bullet: "bg-sky-500",
    },
  };

  const s = styles[variant];

  return (
    <Card className={`p-5 ${s.bg} border ${s.border} rounded-2xl`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`size-5 ${s.icon}`} />
        <h3 className="text-charcoal text-sm font-semibold">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div
              className={`size-1.5 rounded-full ${s.bullet} mt-2 shrink-0`}
            />
            <p className="text-charcoal/80 text-sm leading-relaxed">{item}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function FeedbackReportDisplay({
  report,
  personaName,
  durationSeconds,
  insights = [],
  onBack,
}: FeedbackReportDisplayProps) {
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const overallLabel =
    report.overall_score >= 80
      ? "Excellent Performance"
      : report.overall_score >= 60
        ? "Solid Performance"
        : report.overall_score >= 40
          ? "Needs Improvement"
          : "Significant Gaps";

  return (
    <div className="animate-fade-up mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* Overall Score Card */}
      <Card className="border-border/60 rounded-3xl border bg-white p-8 text-center">
        <div className="bg-cream mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2">
          <BarChart3 className="text-charcoal size-4" />
          <span className="text-charcoal text-xs font-semibold tracking-wide uppercase">
            Performance Report
          </span>
        </div>

        <ScoreRing
          score={report.overall_score}
          label={overallLabel}
          size="lg"
        />

        <p className="text-warm-gray mt-4 text-xs">
          {formatDuration(durationSeconds)} call with {personaName}
        </p>

        {/* Sub-scores */}
        <div className="border-border/40 mt-8 flex items-center justify-center gap-8 border-t pt-6">
          <ScoreRing
            score={report.objection_handling_score}
            label="Objection Handling"
            size="sm"
          />
          <ScoreRing
            score={report.closing_effectiveness_score}
            label="Closing"
            size="sm"
          />
          <ScoreRing
            score={report.confidence_score}
            label="Confidence"
            size="sm"
          />
        </div>

        {insights.length > 0 && (
          <div className="border-border/40 mt-8 border-t pt-8 text-left">
            <ObjectionHeatmap
              insights={insights}
              durationSeconds={durationSeconds}
              className="mx-auto max-w-2xl"
            />
            <p className="text-warm-gray mt-4 text-center text-[10px] italic">
              Visualizing key moments from your session. Review these in detail
              below.
            </p>
          </div>
        )}
      </Card>

      {/* Feedback Sections */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FeedbackSection
          icon={Star}
          title="Strengths"
          items={report.strengths}
          variant="success"
        />
        <FeedbackSection
          icon={AlertTriangle}
          title="Weaknesses"
          items={report.weaknesses}
          variant="warning"
        />
        <FeedbackSection
          icon={Lightbulb}
          title="Coach Tips"
          items={[
            ...report.missed_opportunities,
            ...report.suggested_improvements,
          ]}
          variant="info"
        />
      </div>
    </div>
  );
}
