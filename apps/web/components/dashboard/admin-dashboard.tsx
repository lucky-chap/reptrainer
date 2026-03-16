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
  UserCircle,
  Zap,
  Activity,
  Search,
  CheckCircle2,
  MessageSquare,
  Database,
  Brain,
  Star,
} from "lucide-react";
import type { Session, Persona } from "@/lib/db";
import {
  type ProgressReport,
  Team,
  type UserMetrics,
} from "@reptrainer/shared";
import { useAuth } from "@/context/auth-context";
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
  isSessionCompleted,
} from "@/lib/analytics-utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface AdminDashboardProps {
  sessions: Session[];
  personas: Persona[];
  team: Team | null;
  metrics: UserMetrics | null;
}

export function AdminDashboard({
  sessions: allSessions,
  personas,
  team,
  metrics,
}: AdminDashboardProps) {
  const { user } = useAuth();

  // Filter sessions (none for now, but keeping useMemo for structure)
  const sessions = useMemo(() => {
    return allSessions.filter((s) => isSessionCompleted(s as any));
  }, [allSessions]);
  // Compute stats
  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce(
    (sum, s) => sum + (Number(s.durationSeconds) || 0),
    0,
  );
  const evaluatedSessions = sessions;

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
          <span className="text-warm-gray mb-2 block text-xs font-medium tracking-widest uppercase">
            Admin Dashboard
          </span>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            Team <em>Overview.</em>
          </h1>
          <p className="text-warm-gray mt-2 text-base">
            Monitor your team's collective progress and manage training assets.
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Team Sessions"
          value={totalSessions.toString()}
          subtext={`${Math.floor(totalDuration / 60)}m total practice`}
        />
        <StatCard
          icon={Star}
          value={avgScore > 0 ? `${avgScore}/100` : "—"}
          subtext={
            evaluatedSessions.length > 0
              ? `From ${evaluatedSessions.length} evaluated`
              : "Complete a session to see"
          }
        />
        <StatCard
          icon={Target}
          label="Active Personas"
          value={personas.length.toString()}
          subtext="Buyer profiles generated"
        />
        <StatCard
          icon={Database}
          label="Knowledge Base"
          value={team?.hasKnowledgeBase ? "Active" : "Empty"}
          subtext="Powering your training"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Performance Chart */}
        <Card className="border-border/60 shadow-none lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold">
                Performance Trend
              </CardTitle>
              <CardDescription className="text-xs">
                Last {trendData.length} sessions
              </CardDescription>
            </div>
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
                    <Line
                      type="monotone"
                      dataKey="confidence"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="border-border/40 flex h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed">
                <BarChart3 className="text-warm-gray/30 size-8" />
                <p className="text-warm-gray text-sm">
                  Complete team sessions to see collective performance trends
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill breakdown */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold">
              Skill Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Average scores
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
              Recent Sessions
            </CardTitle>
            <Link href="/dashboard/history" className="gap-1">
              <Button variant="brandOutline" className="flex items-center px-3">
                View all
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
                No sessions yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <QuickAction
            href="/dashboard/train"
            icon={Swords}
            title="Start Roleplay"
            description="Jump into a live AI sales conversation"
          />
          <QuickAction
            href="/dashboard/knowledge"
            icon={Brain}
            title="Update Knowledge"
            description="Upload product docs to power AI"
          />
          <QuickAction
            href="/dashboard/personas"
            icon={UserCircle}
            title="Generate Persona"
            description="Create a new AI buyer personality"
          />
        </div>
      </div>
    </div>
  );
}

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
