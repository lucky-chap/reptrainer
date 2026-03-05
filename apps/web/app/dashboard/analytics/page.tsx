"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Zap,
  Activity,
  Calendar,
  BarChart3,
  Award,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { subscribeSessions } from "@/lib/db";
import type { Session } from "@/lib/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => setLoading(false), 100);

    const unsub = subscribeSessions(
      user.uid,
      (data) => setSessions(data),
      (err) => console.error("Analytics subscription error:", err),
    );

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [user]);

  // Compute Analytics
  const evaluatedSessions = sessions.filter((s) => s.evaluation);
  const totalSessions = sessions.length;

  const avgScores =
    evaluatedSessions.length > 0
      ? {
          overall: Math.round(
            evaluatedSessions.reduce((sum, s) => {
              const e = s.evaluation!;
              return (
                sum +
                (e.objectionHandlingScore +
                  e.confidenceScore +
                  e.clarityScore) /
                  3
              );
            }, 0) / evaluatedSessions.length,
          ),
          objection: Math.round(
            evaluatedSessions.reduce(
              (sum, s) => sum + s.evaluation!.objectionHandlingScore,
              0,
            ) / evaluatedSessions.length,
          ),
          confidence: Math.round(
            evaluatedSessions.reduce(
              (sum, s) => sum + s.evaluation!.confidenceScore,
              0,
            ) / evaluatedSessions.length,
          ),
          clarity: Math.round(
            evaluatedSessions.reduce(
              (sum, s) => sum + s.evaluation!.clarityScore,
              0,
            ) / evaluatedSessions.length,
          ),
        }
      : { overall: 0, objection: 0, confidence: 0, clarity: 0 };

  // Trend data (last 14 sessions)
  const trendData = sessions
    .slice(0, 14)
    .reverse()
    .map((s) => {
      if (!s.evaluation) return 0;
      const e = s.evaluation;
      return Math.round(
        (e.objectionHandlingScore + e.confidenceScore + e.clarityScore) / 3,
      );
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          asChild
          variant="ghost"
          className="text-warm-gray hover:text-charcoal -ml-4 w-fit gap-2 transition-colors"
        >
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <span className="text-warm-gray mb-2 block text-xs font-medium tracking-widest uppercase">
            Deep Insights
          </span>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            Performance <em>Analytics.</em>
          </h1>
          <p className="text-warm-gray mt-2 max-w-2xl text-base">
            Track your journey from pitch to close. See how your skills have
            evolved across every roleplay session.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard
          label="Overall Mastery"
          value={`${avgScores.overall}/10`}
          icon={Award}
          description="Average across all evaluated sessions"
        />
        <MetricCard
          label="Training Intensity"
          value={totalSessions.toString()}
          icon={Activity}
          description="Total roleplay sessions completed"
        />
        <MetricCard
          label="Recent Consistency"
          value={sessions
            .filter((s) => {
              const sessionDate = new Date(s.createdAt);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return sessionDate > weekAgo;
            })
            .length.toString()}
          icon={Calendar}
          description="Sessions in the last 7 days"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend Chart */}
        <Card className="border-border/60 overflow-hidden bg-white shadow-none lg:col-span-2">
          <CardHeader className="border-border/40 bg-cream/20 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Progress Timeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Performance score over last {trendData.length} sessions
                </CardDescription>
              </div>
              <BarChart3 className="text-warm-gray size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {trendData.length > 0 ? (
              <div className="space-y-3">
                {/* Chart Area */}
                <div className="relative">
                  {/* Background Grid Lines */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
                    {[10, 8, 6, 4, 2].map((level) => (
                      <div key={level} className="flex items-center gap-2">
                        <span className="text-warm-gray/30 w-5 text-right text-[9px] font-medium">
                          {level}
                        </span>
                        <div className="border-border/30 flex-1 border-b border-dashed" />
                      </div>
                    ))}
                  </div>

                  {/* Bars */}
                  <div className="flex h-64 items-end gap-2 pr-1 pl-8">
                    {trendData.map((score, i) => (
                      <div
                        key={i}
                        className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                      >
                        {/* Always-visible Score */}
                        <span
                          className={cn(
                            "text-[11px] font-bold transition-colors duration-300",
                            score >= 8
                              ? "text-charcoal"
                              : score >= 5
                                ? "text-warm-gray"
                                : "text-warm-gray-light",
                          )}
                        >
                          {score > 0 ? score : "–"}
                        </span>

                        {/* Thick Rounded Bar */}
                        <div
                          className={cn(
                            "w-full max-w-10 rounded-lg transition-all duration-700 ease-out",
                            "group-hover:scale-[1.05] group-hover:shadow-md",
                            score >= 8
                              ? "bg-charcoal"
                              : score >= 5
                                ? "bg-warm-gray"
                                : "bg-cream-dark",
                          )}
                          style={{
                            height: `${score > 0 ? Math.max((score / 10) * 100, 8) : 6}%`,
                          }}
                        />

                        {/* Session Label */}
                        <span className="text-warm-gray/40 text-[9px] font-medium tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-5 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-charcoal size-2.5 rounded-full" />
                    <span className="text-warm-gray text-[10px] font-medium">
                      Strong (8-10)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="bg-warm-gray size-2.5 rounded-full" />
                    <span className="text-warm-gray text-[10px] font-medium">
                      Average (5-7)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="bg-cream-dark size-2.5 rounded-full" />
                    <span className="text-warm-gray text-[10px] font-medium">
                      Needs Work (1-4)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-border/40 flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed">
                <BarChart3 className="text-warm-gray/30 size-8" />
                <p className="text-warm-gray text-sm italic">
                  Not enough data to graph your progress yet.
                </p>
              </div>
            )}
            <div className="text-warm-gray/60 mt-6 flex justify-between text-[10px] font-bold tracking-widest uppercase">
              <span>Earlier Sessions</span>
              <span>Most Recent</span>
            </div>
          </CardContent>
        </Card>

        {/* Skill Composition */}
        <Card className="border-border/60 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-bold">Skill Mastery</CardTitle>
            <CardDescription className="text-xs">
              Weighted averages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <SkillMetric
              label="Objection Handling"
              score={avgScores.objection}
              icon={Target}
              color="bg-charcoal"
            />
            <SkillMetric
              label="Confidence"
              score={avgScores.confidence}
              icon={Zap}
              color="bg-warm-gray"
            />
            <SkillMetric
              label="Clarity"
              score={avgScores.clarity}
              icon={TrendingUp}
              color="bg-warm-gray-light"
            />

            {evaluatedSessions.length === 0 && (
              <div className="pt-4 text-center">
                <p className="text-warm-gray text-xs italic">
                  Complete evaluated sessions to see your skill breakdown.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table-ish */}
      <Card className="border-border/60 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Performance History
          </CardTitle>
          <CardDescription className="text-xs">
            A detailed look at your last few sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-border/40 border-b">
                  <th className="text-warm-gray/60 px-2 pb-4 text-[10px] font-bold tracking-widest uppercase">
                    Date
                  </th>
                  <th className="text-warm-gray/60 px-2 pb-4 text-[10px] font-bold tracking-widest uppercase">
                    Focus Area
                  </th>
                  <th className="text-warm-gray/60 px-2 pb-4 text-right text-[10px] font-bold tracking-widest uppercase">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/20 divide-y">
                {sessions.slice(0, 5).map((session) => (
                  <tr
                    key={session.id}
                    className="group hover:bg-cream/10 transition-colors"
                  >
                    <td className="text-charcoal px-2 py-4 text-sm font-medium">
                      {new Date(session.createdAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </td>
                    <td className="px-2 py-4">
                      <span className="text-warm-gray text-xs capitalize">
                        {session.evaluation?.strengths[0] || "General Practice"}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-right">
                      <span
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-lg text-xs font-bold",
                          session.evaluation
                            ? "bg-charcoal text-cream"
                            : "bg-cream-dark text-warm-gray",
                        )}
                      >
                        {session.evaluation
                          ? Math.round(
                              (session.evaluation.objectionHandlingScore +
                                session.evaluation.confidenceScore +
                                session.evaluation.clarityScore) /
                                3,
                            )
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: string;
  icon: any;
  description: string;
}) {
  return (
    <Card className="border-border/60 group hover:border-charcoal/20 bg-white shadow-none transition-colors">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="bg-cream group-hover:bg-charcoal group-hover:text-cream rounded-xl p-2 transition-colors duration-300">
            <Icon className="size-5" />
          </div>
          <span className="text-warm-gray/60 text-[10px] font-bold tracking-widest uppercase">
            {label}
          </span>
        </div>
        <p className="heading-serif text-charcoal mb-1 text-3xl">{value}</p>
        <p className="text-warm-gray text-[11px] leading-tight">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function SkillMetric({
  label,
  score,
  icon: Icon,
  color,
}: {
  label: string;
  score: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="group space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-charcoal flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
          <Icon className="text-warm-gray group-hover:text-charcoal size-3.5 transition-colors" />
          {label}
        </span>
        <span className="text-charcoal text-xs font-bold">
          {score > 0 ? `${score}/10` : "—"}
        </span>
      </div>
      <div className="bg-cream h-2 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            color,
          )}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
}
