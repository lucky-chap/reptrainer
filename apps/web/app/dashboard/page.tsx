"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Swords,
  TrendingUp,
  Target,
  Clock,
  ArrowRight,
  BarChart3,
  UserCircle,
  Package,
  Star,
  Zap,
  Activity,
} from "lucide-react";
import type { Session, Persona, Product } from "@/lib/db";
import {
  subscribeProducts,
  subscribePersonas,
  subscribeSessions,
} from "@/lib/db";
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
import { cn } from "@/lib/utils";
import { getOverallScore } from "@/lib/analytics-utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Set loading false almost immediately so we don't hide the UI
    // behind a spinner while waiting for all 3 collections.
    const loadingTimer = setTimeout(() => setLoading(false), 100);

    const handleError = (err: Error) => {
      console.error("Dashboard subscription error:", err);
      if (err.message?.includes("index")) {
        setError(
          "Database indexes are being prepared. This takes a few minutes.",
        );
      } else {
        setError("Failed to load data. Please refresh.");
      }
      setLoading(false);
    };

    const unsubProducts = subscribeProducts(
      user.uid,
      (data) => setProducts(data),
      handleError,
    );

    const unsubPersonas = subscribePersonas(
      user.uid,
      (data) => setPersonas(data),
      handleError,
    );

    const unsubSessions = subscribeSessions(
      user.uid,
      (data) => setSessions(data),
      handleError,
    );

    return () => {
      clearTimeout(loadingTimer);
      unsubProducts();
      unsubPersonas();
      unsubSessions();
    };
  }, [user]);

  // Compute stats
  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const evaluatedSessions = sessions.filter((s) => s.evaluation);
  const avgScore = useMemo(() => {
    if (evaluatedSessions.length === 0) return 0;
    return Math.round(
      evaluatedSessions.reduce((sum, s) => {
        return sum + getOverallScore(s.evaluation);
      }, 0) / evaluatedSessions.length,
    );
  }, [evaluatedSessions]);

  const avgObjection =
    evaluatedSessions.length > 0
      ? Math.round(
          evaluatedSessions.reduce(
            (sum, s) => sum + s.evaluation!.objectionHandlingScore,
            0,
          ) / evaluatedSessions.length,
        )
      : 0;

  const avgConfidence =
    evaluatedSessions.length > 0
      ? Math.round(
          evaluatedSessions.reduce(
            (sum, s) => sum + s.evaluation!.confidenceScore,
            0,
          ) / evaluatedSessions.length,
        )
      : 0;

  const avgClarity =
    evaluatedSessions.length > 0
      ? Math.round(
          evaluatedSessions.reduce(
            (sum, s) => sum + s.evaluation!.clarityScore,
            0,
          ) / evaluatedSessions.length,
        )
      : 0;

  // Recent sessions (last 7)
  const recentSessions = sessions.slice(0, 7);

  // Trend data for chart (last 7 sessions)
  const trendData = useMemo(() => {
    return sessions
      .slice(0, 7)
      .reverse()
      .map((s, i) => {
        return {
          name: i + 1,
          score: getOverallScore(s.evaluation),
          confidence: s.evaluation?.confidenceScore || 0,
        };
      });
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50">
          <Activity className="size-6 text-red-500" />
        </div>
        <h3 className="text-charcoal mb-2 text-lg font-semibold">
          Something went wrong
        </h3>
        <p className="text-warm-gray mb-6 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-charcoal text-cream hover:bg-charcoal-light rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="text-warm-gray mb-2 block text-xs font-medium tracking-widest uppercase">
            Dashboard
          </span>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            Welcome <em>{user?.displayName?.split(" ")[0] || "back"}.</em>
          </h1>
          <p className="text-warm-gray mt-2 text-base">
            Here&apos;s how your sales training is progressing.
          </p>
        </div>
        <Button asChild variant="brand" className="px-6">
          <Link href="/dashboard/train" className="gap-2">
            <Swords className="size-4" />
            Start training
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Total Sessions"
          value={totalSessions.toString()}
          subtext={`${Math.floor(totalDuration / 60)}m total practice`}
        />
        <StatCard
          icon={Star}
          label="Avg. Score"
          value={avgScore > 0 ? `${avgScore}/10` : "—"}
          subtext={
            evaluatedSessions.length > 0
              ? `From ${evaluatedSessions.length} evaluated`
              : "Complete a session to see"
          }
        />
        <StatCard
          icon={UserCircle}
          label="Personas"
          value={personas.length.toString()}
          subtext={`Across ${products.length} products`}
        />
        <StatCard
          icon={Package}
          label="Products"
          value={products.length.toString()}
          subtext="Configured for training"
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
                Your last {trendData.length} sessions
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
                  View full Analytics
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
                      label={{
                        value: "Session ID",
                        position: "insideBottom",
                        offset: -10,
                        fontSize: 10,
                        fill: "#9CA3AF",
                      }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Score",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 10,
                        fill: "#9CA3AF",
                        offset: 10,
                      }}
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
                  Complete sessions to see your performance trend
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
            <SkillBar
              icon={Target}
              label="Objection Handling"
              score={avgObjection}
            />
            <SkillBar icon={Zap} label="Confidence" score={avgConfidence} />
            <SkillBar icon={TrendingUp} label="Clarity" score={avgClarity} />

            {evaluatedSessions.length === 0 && (
              <p className="text-warm-gray pt-2 text-center text-[10px] font-medium tracking-wider uppercase">
                Complete evaluated sessions to see stats
              </p>
            )}
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
            <Button variant="brandOutline" size="sm" asChild className="px-3">
              <Link href="/dashboard/history" className="gap-1">
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
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
                          {persona?.name.charAt(0) ||
                            session.personaName?.charAt(0) ||
                            "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-charcoal truncate text-sm font-bold">
                            {persona?.name || session.personaName || "Unknown"}
                          </p>
                          <div className="text-warm-gray/60 mt-0.5 flex items-center gap-3 text-[10px] font-bold tracking-wider uppercase">
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3" />
                              {Math.floor(session.durationSeconds / 60)}m{" "}
                              {session.durationSeconds % 60}s
                            </span>
                            <span>
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {hasEvaluation && (
                        <div className="shrink-0 text-right">
                          <span className="text-charcoal text-lg font-bold">
                            {score}
                          </span>
                          <span className="text-warm-gray/60 text-[10px] font-bold">
                            /10
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-warm-gray mb-6 text-sm">
                  No sessions yet. Start your first training session.
                </p>
                <Button asChild variant="brand">
                  <Link href="/dashboard/train">Begin training</Link>
                </Button>
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
            href="/dashboard/products"
            icon={Package}
            title="Add Product"
            description="Configure a new product for training"
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

/* ─── Sub-components ───────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
}) {
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

function SkillBar({
  icon: Icon,
  label,
  score,
}: {
  icon: React.ElementType;
  label: string;
  score: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-charcoal flex items-center gap-2.5 text-xs font-bold tracking-wider uppercase">
          <Icon className="text-warm-gray size-3.5" />
          {label}
        </span>
        <span className="text-charcoal text-xs font-bold">
          {score > 0 ? `${score}/10` : "—"}
        </span>
      </div>
      <Progress value={score * 10} className="h-1.5" />
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
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
