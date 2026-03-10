"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Swords,
  TrendingUp,
  Target,
  ArrowRight,
  BarChart3,
  Star,
  Zap,
  Activity,
  History as HistoryIcon,
  MessageSquare,
  Search,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import type { User } from "firebase/auth";
import type { Session, Persona } from "@/lib/db";
import { type Team, type UserMetrics } from "@reptrainer/shared";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getOverallScore,
  calculateSessionMetrics,
} from "@/lib/analytics-utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Badge } from "../ui/badge";

interface MemberDashboardProps {
  user: User | null;
  sessions: Session[];
  personas: Persona[];
  team: Team | null;
  metrics: UserMetrics | null;
}

export function MemberDashboard({
  user,
  sessions: allSessions,
  personas,
  team,
  metrics,
}: MemberDashboardProps) {
  // Defensive filtering: ensure we only show the user's own sessions
  const sessions = useMemo(() => {
    return allSessions.filter((s) => s.userId === user?.uid);
  }, [allSessions, user?.uid]);
  const { activeMembership } = useTeam();

  // Compute stats
  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const evaluatedSessions = sessions.filter((s) => s.evaluation);

  const {
    avgScore,
    avgDiscovery,
    avgObjection,
    avgPositioning,
    avgClosing,
    avgListening,
  } = useMemo(() => {
    if (evaluatedSessions.length === 0) {
      return {
        avgScore: 0,
        avgDiscovery: 0,
        avgObjection: 0,
        avgPositioning: 0,
        avgClosing: 0,
        avgListening: 0,
      };
    }

    const totals = evaluatedSessions.reduce(
      (acc, s) => {
        const metrics = calculateSessionMetrics(s);
        acc.overall += metrics.overall;
        acc.discovery += metrics.discovery;
        acc.objection += metrics.objection_handling;
        acc.positioning += metrics.positioning;
        acc.closing += metrics.closing;
        acc.listening += metrics.listening;
        return acc;
      },
      {
        overall: 0,
        discovery: 0,
        objection: 0,
        positioning: 0,
        closing: 0,
        listening: 0,
      },
    );

    const count = evaluatedSessions.length;
    return {
      avgScore: Math.round(totals.overall / count),
      avgDiscovery: Math.round(totals.discovery / count),
      avgObjection: Math.round(totals.objection / count),
      avgPositioning: Math.round(totals.positioning / count),
      avgClosing: Math.round(totals.closing / count),
      avgListening: Math.round(totals.listening / count),
    };
  }, [evaluatedSessions]);

  // Recent sessions (last 7)
  const recentSessions = sessions.slice(0, 7);

  const trendData = useMemo(() => {
    return sessions
      .slice(0, 7)
      .reverse()
      .map((s) => {
        const date = new Date(s.createdAt);
        const metrics = calculateSessionMetrics(s);
        return {
          name: date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          score: metrics.overall,
          confidence: metrics.confidence,
        };
      });
  }, [sessions]);

  return (
    <div className="animate-fade-up space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="text-warm-gray mb-2 flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
            Personal Performance{" "}
            <Badge className="bg-yellow-200 text-black">
              {activeMembership?.name ? `Team ${activeMembership.name}` : ""}
            </Badge>
          </span>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            Your <em>Training.</em>
          </h1>
          <p className="text-warm-gray mt-2 text-base">
            Track your progress, review your performance, and sharpen your
            skills.
          </p>
        </div>
        <Button
          asChild
          className="bg-charcoal text-cream hover:bg-charcoal/90 h-auto rounded-full px-8 py-4 text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
        >
          <Link href="/dashboard/analytics" className="flex items-center gap-2">
            View Deep Insights
            <TrendingUp className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Your Sessions"
          value={totalSessions.toString()}
          subtext={`${Math.floor(totalDuration / 60)}m time on field`}
        />
        <StatCard
          icon={Zap}
          label="Practice Streak"
          value={
            metrics?.practiceStreak ? `${metrics.practiceStreak} Days` : "—"
          }
          subtext={
            metrics?.lastPracticeDate
              ? `Last Session: ${new Date(metrics.lastPracticeDate).toLocaleDateString()}`
              : "Keep the momentum going"
          }
        />
        <StatCard
          icon={Star}
          label="Average Score"
          value={avgScore > 0 ? `${avgScore}/100` : "—"}
          subtext={
            evaluatedSessions.length > 0
              ? `Based on ${evaluatedSessions.length} sessions`
              : "Complete sessions to calculate"
          }
        />
        <StatCard
          icon={TrendingUp}
          label="Improvement"
          value={(() => {
            if (evaluatedSessions.length < 4) return "—";
            const recent3 = evaluatedSessions.slice(0, 3);
            const prev3 = evaluatedSessions.slice(3, 6);
            if (prev3.length === 0) return "—";
            const recentAvg =
              recent3.reduce(
                (sum, s) => sum + calculateSessionMetrics(s).overall,
                0,
              ) / recent3.length;
            const prevAvg =
              prev3.reduce(
                (sum, s) => sum + calculateSessionMetrics(s).overall,
                0,
              ) / prev3.length;
            const diff = Math.round(recentAvg - prevAvg);
            return diff >= 0 ? `+${diff}%` : `${diff}%`;
          })()}
          subtext="vs. previous 3 sessions"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Performance Chart */}
        <Card className="border-border/60 shadow-none lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold">
                Your Growth Trend
              </CardTitle>
              <CardDescription className="text-xs">
                Performance over your last {trendData.length} sessions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-warm-gray hover:text-charcoal h-8 gap-1.5 px-3"
            >
              <Link href="/dashboard/analytics">
                <span className="text-[10px] font-bold tracking-widest uppercase">
                  Details
                </span>
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {trendData.length > 1 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFF",
                        borderRadius: "12px",
                        border: "1px solid #E5E7EB",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#1A1A1A"
                      strokeWidth={3}
                      dot={{ fill: "#1A1A1A", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="border-border/40 flex h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed">
                <BarChart3 className="text-warm-gray/30 size-8" />
                <p className="text-warm-gray text-sm">
                  Complete more sessions to visualize your growth
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill breakdown */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold">Your Mastery</CardTitle>
            <CardDescription className="text-xs">
              Skill breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SkillBar icon={Search} label="Discovery" score={avgDiscovery} />
            <SkillBar
              icon={Target}
              label="Objection Handling"
              score={avgObjection}
            />
            <SkillBar
              icon={Zap}
              label="Product Positioning"
              score={avgPositioning}
            />
            <SkillBar
              icon={CheckCircle2}
              label="Closing Success"
              score={avgClosing}
            />
            <SkillBar
              icon={MessageSquare}
              label="Active Listening"
              score={avgListening}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Sessions */}
        <Card className="border-border/60 shadow-none lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-bold">
              Recent Performance
            </CardTitle>
            <Link href="/dashboard/history" className="gap-1">
              <Button variant="brandOutline" className="flex items-center px-3">
                Full History
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-1">
                {recentSessions.slice(0, 5).map((session) => {
                  const persona = personas.find(
                    (p) => p.id === session.personaId,
                  );
                  const score = getOverallScore(session.evaluation);
                  const hasEvaluation = !!session.evaluation;

                  return (
                    <div
                      key={session.id}
                      className="border-border/40 flex items-center justify-between border-b py-4 last:border-0"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-charcoal text-cream flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                          {persona?.avatarUrl ? (
                            <Image
                              src={persona?.avatarUrl}
                              alt={persona?.name}
                              className="h-full w-full rounded-full object-cover"
                              width={48}
                              height={48}
                            />
                          ) : (
                            persona?.name.charAt(0) || "?"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-charcoal truncate text-sm font-bold">
                            {session.userId === user?.uid
                              ? "You"
                              : session.userName || "Unknown"}{" "}
                            <span className="text-warm-gray/60 font-medium">
                              practiced with{" "}
                              {persona?.name ||
                                session.personaName ||
                                "Unknown"}
                            </span>
                          </p>
                          <p className="text-warm-gray/60 mt-0.5 text-[10px] font-bold tracking-wider uppercase">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {hasEvaluation && (
                        <div className="shrink-0 text-right">
                          <span className="text-charcoal text-lg font-bold">
                            {score}
                          </span>
                          <span className="text-warm-gray/60 text-[10px] font-bold">
                            %
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-warm-gray py-12 text-center">
                No sessions yet. Time to hit the field!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <QuickAction
            href="/dashboard/train"
            icon={Swords}
            title="Practice Pitching"
            description="Start a new AI roleplay session"
          />
          <QuickAction
            href="/dashboard/history"
            icon={HistoryIcon}
            title="Review Sessions"
            description="See where you can improve"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, subtext }: any) {
  return (
    <Card className="border-border/60 group shadow-none transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="bg-cream/50 group-hover:bg-charcoal/5 rounded-lg p-2 transition-colors">
            <Icon className="text-warm-gray size-4" />
          </div>
          <span className="text-warm-gray/60 text-[10px] font-bold tracking-widest uppercase">
            {label}
          </span>
        </div>
        <p className="heading-serif text-charcoal mb-1 text-2xl font-bold md:text-3xl">
          {value}
        </p>
        <p className="text-warm-gray/60 text-[11px] leading-relaxed font-medium">
          {subtext}
        </p>
      </CardContent>
    </Card>
  );
}

function SkillBar({ icon: Icon, label, score }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-charcoal flex items-center gap-2.5 text-xs font-bold tracking-wider uppercase">
          <Icon className="text-warm-gray size-3.5" />
          {label}
        </span>
        <span className="text-charcoal text-xs font-bold">
          {score > 0 ? `${score}%` : "—"}
        </span>
      </div>
      <Progress value={score} className="h-1.5" />
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, description }: any) {
  return (
    <Link href={href} className="group block">
      <Card className="border-border/60 shadow-none transition-all duration-300 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="bg-cream group-hover:bg-charcoal group-hover:text-cream rounded-xl p-3 transition-colors duration-300">
              <Icon className="size-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-charcoal mb-1 text-sm font-bold tracking-wider uppercase">
                {title}
              </h4>
              <p className="text-warm-gray text-xs leading-relaxed">
                {description}
              </p>
            </div>
            <ArrowRight className="text-warm-gray/40 group-hover:text-charcoal mt-1 size-4 transition-all group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
