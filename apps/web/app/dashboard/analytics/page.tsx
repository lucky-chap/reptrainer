"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Calendar,
  BarChart3,
  Award,
  Mic2,
  ShieldAlert,
  Search,
  MessageSquare,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import {
  subscribeSessions,
  subscribeProducts,
  subscribePersonas,
  subscribeTeamMembers,
  subscribeSessionsByUserIds,
} from "@/lib/db";
import type { Session, Product, Persona, TeamMember } from "@/lib/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  calculateCompetencies,
  calculateTeamCoverage,
  calculateCategoryScores,
  getOverallScore,
  calculateSessionMetrics,
  generateCoachingInsights,
} from "@/lib/analytics-utils";

import { CoachingInsights } from "@/components/analytics/coaching-insights";
import {
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    isAdmin,
    memberships,
    activeMembership,
    loading: teamLoading,
  } = useTeam();
  const teamIds = useMemo(() => memberships.map((m) => m.id), [memberships]);
  const [viewMode, setViewMode] = useState<"team" | "personal">("personal");
  const isTeamView = viewMode === "team";

  useEffect(() => {
    if (!teamLoading) {
      const timer = setTimeout(() => {
        setViewMode(isAdmin ? "team" : "personal");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAdmin, teamLoading]);

  // Filters
  const [timeframe, setTimeframe] = useState<string>("all");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

  useEffect(() => {
    if (!user || teamLoading) return;

    const timer = setTimeout(() => setLoading(false), 100);

    let unsubSessions = () => {};

    if (viewMode === "team" && teamMembers.length > 0) {
      const memberIds = teamMembers.map((m) => m.userId);
      unsubSessions = subscribeSessionsByUserIds(
        memberIds,
        (data) => setSessions(data),
        (err) => console.error("Analytics team sessions error:", err),
      );
    } else {
      unsubSessions = subscribeSessions(
        user.uid,
        [],
        (data) => setSessions(data),
        (err) => console.error("Analytics personal sessions error:", err),
      );
    }

    const unsubProducts = subscribeProducts(
      user.uid,
      activeMembership?.id ? [activeMembership.id] : teamIds,
      (data) => setProducts(data),
      (err) => console.error("Analytics products error:", err),
    );

    const unsubPersonas = subscribePersonas(
      user.uid,
      activeMembership?.id ? [activeMembership.id] : teamIds,
      (data) => setPersonas(data),
      (err) => console.error("Analytics personas error:", err),
    );

    return () => {
      clearTimeout(timer);
      unsubSessions();
      unsubProducts();
      unsubPersonas();
    };
  }, [user, teamIds, teamLoading, viewMode, teamMembers, activeMembership?.id]);

  // Subscribe to team members if in team mode
  useEffect(() => {
    if (viewMode !== "team" || !activeMembership?.id) {
      const timer = setTimeout(() => {
        setTeamMembers([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    return subscribeTeamMembers(
      activeMembership.id,
      (data) => setTeamMembers(data),
      (err) => console.error("Analytics team members error:", err),
    );
  }, [viewMode, activeMembership?.id]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Timeframe filter
      if (timeframe !== "all") {
        const sessionDate = new Date(s.createdAt);
        const now = new Date();
        const days = parseInt(timeframe);
        const cutoff = new Date(now.setDate(now.getDate() - days));
        if (sessionDate < cutoff) return false;
      }

      // Product filter
      if (selectedProductId !== "all" && s.productId !== selectedProductId) {
        return false;
      }

      // Persona filter
      if (selectedPersonaId !== "all" && s.personaId !== selectedPersonaId) {
        return false;
      }

      // Member filter
      if (selectedMemberId !== "all" && s.userId !== selectedMemberId) {
        return false;
      }

      return true;
    });
  }, [
    sessions,
    timeframe,
    selectedPersonaId,
    selectedProductId,
    selectedMemberId,
  ]);

  // Compute Analytics based on filtered sessions
  const evaluatedSessions = useMemo(
    () => filteredSessions.filter((s) => s.evaluation),
    [filteredSessions],
  );
  const totalSessions = filteredSessions.length;

  const avgScores = useMemo(() => {
    if (evaluatedSessions.length === 0) {
      return {
        overall: 0,
        discovery: 0,
        objection: 0,
        positioning: 0,
        closing: 0,
        listening: 0,
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
      overall: Math.round(totals.overall / count),
      discovery: Math.round(totals.discovery / count),
      objection: Math.round(totals.objection / count),
      positioning: Math.round(totals.positioning / count),
      closing: Math.round(totals.closing / count),
      listening: Math.round(totals.listening / count),
    };
  }, [evaluatedSessions]);

  // Advanced Analytics Data
  const competencyData = useMemo(
    () => calculateCompetencies(filteredSessions),
    [filteredSessions],
  );
  const coverageData = useMemo(
    () => calculateTeamCoverage(filteredSessions, products, personas),
    [filteredSessions, products, personas],
  );
  const personaScores = useMemo(
    () => calculateCategoryScores(filteredSessions, "persona"),
    [filteredSessions],
  );
  const productScores = useMemo(
    () => calculateCategoryScores(filteredSessions, "product", products),
    [filteredSessions, products],
  );

  // Unique members for filter
  const members = useMemo(() => {
    if (viewMode === "team" && teamMembers.length > 0) {
      return teamMembers.map((m) => ({
        id: m.userId,
        name:
          m.userName ||
          (m.userId === user?.uid
            ? user.displayName || "You"
            : "Unknown Member"),
      }));
    }

    // Fallback to deriving from sessions for personal view or if member list not yet loaded
    const memberMap = new Map<string, { id: string; name: string }>();
    sessions.forEach((s) => {
      if (s.userId && !memberMap.has(s.userId)) {
        memberMap.set(s.userId, {
          id: s.userId,
          name:
            s.userName ||
            (s.userId === user?.uid
              ? user.displayName || "You"
              : "Unknown Member"),
        });
      }
    });
    return Array.from(memberMap.values());
  }, [sessions, teamMembers, viewMode, user]);

  // Trend data
  const trendData = useMemo(() => {
    // If timeframe is "all", we might want to show more than 14 for the full view,
    // but for performance trend chart 14-20 is usually a good range.
    const limit = timeframe === "all" ? 20 : 14;
    return filteredSessions
      .slice(0, limit)
      .reverse()
      .map((s, i) => {
        const metrics = calculateSessionMetrics(s);
        return {
          name: i + 1,
          score: metrics.overall,
          objection: metrics.objection_handling,
          listening: metrics.listening,
        };
      });
  }, [filteredSessions, timeframe]);

  const insights = useMemo(() => {
    return generateCoachingInsights(
      filteredSessions,
      selectedMemberId !== "all"
        ? members.find((m) => m.id === selectedMemberId)?.name || "Member"
        : "All Members",
      viewMode === "team" && selectedMemberId === "all",
    );
  }, [filteredSessions, selectedMemberId, members, viewMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
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

          {isAdmin && (
            <Tabs
              value={viewMode}
              onValueChange={(v: string) =>
                setViewMode(v as "team" | "personal")
              }
            >
              <TabsList className="bg-cream/50 border-border/40 border">
                <TabsTrigger value="team" className="text-xs">
                  Team
                </TabsTrigger>
                <TabsTrigger value="personal" className="text-xs">
                  Personal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <div>
          <span className="text-warm-gray mb-2 block text-xs font-medium tracking-widest uppercase">
            Deep Insights
          </span>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            {isTeamView ? "Team" : "Personal"} <em>Performance.</em>
          </h1>
          <p className="text-warm-gray mt-2 max-w-2xl text-base">
            Track {isTeamView ? "your team's" : "your"} journey from pitch to
            close. See how {isTeamView ? "collective" : "your"} skills have
            evolved across every roleplay session.
          </p>
        </div>
      </div>
      {/* Filters Bar */}
      <div className="border-border/40 flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="text-warm-gray size-4" />
          <span className="text-warm-gray text-xs font-bold tracking-wider uppercase">
            Filters:
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Timeframe Filter */}
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="bg-cream/20 w-[140px] font-medium">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Product Filter */}
          <Select
            value={selectedProductId}
            onValueChange={setSelectedProductId}
          >
            <SelectTrigger className="bg-cream/20 w-[180px] font-medium">
              <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.companyName || p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Persona Filter */}
          <Select
            value={selectedPersonaId}
            onValueChange={setSelectedPersonaId}
          >
            <SelectTrigger className="bg-cream/20 w-[180px] font-medium">
              <SelectValue placeholder="Select Persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Personas</SelectItem>
              {personas.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Member Filter */}
          {isTeamView && (
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
            >
              <SelectTrigger className="bg-cream/20 w-[180px] font-medium">
                <SelectValue placeholder="Select Member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(timeframe !== "all" ||
            selectedPersonaId !== "all" ||
            selectedProductId !== "all" ||
            selectedMemberId !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTimeframe("all");
                setSelectedPersonaId("all");
                setSelectedProductId("all");
                setSelectedMemberId("all");
              }}
              className="text-warm-gray hover:text-charcoal text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Coaching Insights */}
      <CoachingInsights insights={insights} />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard
          label={isTeamView ? "Team Mastery" : "Personal Mastery"}
          value={`${avgScores.overall}/100`}
          icon={Award}
          description={
            isTeamView
              ? "Average across all team evaluated sessions"
              : "Average across your evaluated sessions"
          }
        />

        <MetricCard
          label="Training Intensity"
          value={totalSessions.toString()}
          icon={Activity}
          description={
            isTeamView
              ? "Total roleplay sessions completed"
              : "Your total roleplay sessions"
          }
        />
        <MetricCard
          label="Recent Consistency"
          value={(() => {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Filter sessions from the last 7 days
            const recentSessions = filteredSessions.filter((s) => {
              const sessionDate = new Date(s.createdAt);
              return sessionDate >= weekAgo && sessionDate <= now;
            });

            // Count unique days in UTC to be consistent with streak logic
            const uniqueDays = new Set(
              recentSessions.map((s) => {
                const d = new Date(s.createdAt);
                return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
              }),
            ).size;

            return uniqueDays.toString();
          })()}
          icon={Calendar}
          description="Days practiced (last 7 days)"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Progress Timeline */}
        <Card className="border-border/60 min-w-0 overflow-hidden bg-white pt-0 shadow-none lg:col-span-2">
          <CardHeader className="border-border/40 bg-cream/20 border-b pt-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Progress Timeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Performance and sentiment trends over last {trendData.length}{" "}
                  sessions
                </CardDescription>
              </div>
              <BarChart3 className="text-warm-gray size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {trendData.length > 1 ? (
              <div className="h-[300px] w-full">
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
                        value: "Last 14 Sessions",
                        position: "insideBottom",
                        offset: -10,
                        fontSize: 10,
                        fill: "#9CA3AF",
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
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
                      dataKey="objection"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="border-border/40 flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed">
                <BarChart3 className="text-warm-gray/30 size-8" />
                <p className="text-warm-gray text-sm italic">
                  {isTeamView
                    ? "Not enough data to graph the team's progress yet."
                    : "Not enough data to graph your progress yet."}
                </p>
              </div>
            )}
            <div className="text-warm-gray/60 mt-6 flex justify-between text-[10px] font-bold tracking-widest uppercase">
              <span>Earlier Sessions</span>
              <span>Most Recent</span>
            </div>
          </CardContent>
        </Card>

        {/* Competency Radar */}
        <Card className="border-border/60 min-w-0 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {isTeamView ? "Team Skill Radar" : "Personal Skill Radar"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isTeamView
                ? "Holistic view of collective team sales competencies"
                : "Holistic view of your sales competencies"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-[300px] items-center justify-center pt-4">
            {competencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={competencyData}
                >
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#4B5563", fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    axisLine={false}
                    tick={false}
                  />
                  <Radar
                    name="Mastery"
                    dataKey="A"
                    stroke="#1A1A1A"
                    fill="#1A1A1A"
                    fillOpacity={0.15}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-warm-gray text-xs italic">
                {isTeamView
                  ? "Not enough data to reveal team radar."
                  : "Not enough data to reveal your radar."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Skill Breakdown */}
      <Card className="border-border/60 mt-8 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-bold">Skill Breakdown</CardTitle>
          <CardDescription className="text-xs">
            {isTeamView
              ? "Detailed view of collective team sales skills"
              : "Detailed view of your sales skills"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
            <SkillBar
              icon={Search}
              label="Discovery"
              score={avgScores.discovery}
            />
            <SkillBar
              icon={ShieldAlert}
              label="Objection Handling"
              score={avgScores.objection}
            />
            <SkillBar
              icon={MessageSquare}
              label="Product Positioning"
              score={avgScores.positioning}
            />
            <SkillBar
              icon={CheckCircle2}
              label="Closing"
              score={avgScores.closing}
            />
            <div className="md:col-span-1">
              <SkillBar
                icon={Mic2}
                label="Active Listening"
                score={avgScores.listening}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversational Dynamics & Performance History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conversational Dynamics */}
        {/* Team Training Coverage */}
        <Card className="border-border/60 bg-white shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  {isTeamView ? "Team Training Coverage" : "Training Coverage"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isTeamView
                    ? "Practice depth across products"
                    : "Your practice depth across products"}
                </CardDescription>
              </div>
              <Activity className="text-warm-gray size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="space-y-4">
              {coverageData.length > 0 ? (
                coverageData.map((item) => (
                  <div key={item.productName} className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
                      <span className="text-charcoal truncate pr-2">
                        {item.productName}
                      </span>
                      <span className="text-warm-gray shrink-0">
                        {item.practicedPersonas}/{item.totalPersonas} Personas
                      </span>
                    </div>
                    <div className="group relative">
                      <Progress value={item.coverage} className="h-1.5" />
                      <div className="text-warm-gray invisible absolute -top-4 right-0 block text-[8px] font-bold group-hover:visible">
                        {item.coverage}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-warm-gray text-xs italic">
                  No product mapping data available.
                </p>
              )}
            </div>

            <div className="border-border/20 mt-6 border-t pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-charcoal/5 flex flex-1 flex-col items-center rounded-xl p-3">
                  <span className="text-charcoal text-lg font-bold">
                    {Math.round(
                      coverageData.reduce(
                        (acc, curr) => acc + curr.coverage,
                        0,
                      ) / (coverageData.length || 1),
                    )}
                    %
                  </span>
                  <span className="text-warm-gray/60 text-[8px] font-bold tracking-widest uppercase">
                    {isTeamView ? "Total Coverage" : "Your Coverage"}
                  </span>
                </div>
                <div className="bg-charcoal/5 flex flex-1 flex-col items-center rounded-xl p-3">
                  <span className="text-charcoal text-lg font-bold">
                    {coverageData.reduce(
                      (acc, curr) => acc + curr.practicedPersonas,
                      0,
                    )}
                  </span>
                  <span className="text-warm-gray/60 text-[8px] font-bold tracking-widest uppercase">
                    {isTeamView ? "Mastered Scenarios" : "Personas Practiced"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Performance History */}
        <Card className="border-border/60 bg-white shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {isTeamView ? "Team Activity Feed" : "Your Session Feed"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isTeamView
                ? "Recent roleplay sessions across the team"
                : "Your most recent roleplay sessions"}
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
                      Activity
                    </th>
                    <th className="text-warm-gray/60 px-2 pb-4 text-right text-[10px] font-bold tracking-widest uppercase">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border/20 divide-y">
                  {filteredSessions.slice(0, 5).map((session) => (
                    <tr
                      key={session.id}
                      className="group hover:bg-cream/10 transition-colors"
                    >
                      <td className="text-charcoal px-2 py-4 text-sm font-medium">
                        {new Date(session.createdAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex flex-col">
                          <span className="text-charcoal text-xs font-semibold">
                            {isTeamView
                              ? session.userName || "Team Member"
                              : session.userName || user?.displayName || "You"}
                          </span>
                          <span className="text-warm-gray text-[10px]">
                            vs. {session.personaName} ({session.personaRole})
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-4 text-right">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                            session.evaluation
                              ? "bg-charcoal text-cream"
                              : "bg-cream-dark text-warm-gray",
                          )}
                        >
                          {session.evaluation
                            ? getOverallScore(session.evaluation)
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

      {/* Category Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/60 min-w-0 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Persona Performance
            </CardTitle>
            <CardDescription className="text-xs">
              Average score per persona
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] pt-4">
            {personaScores.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={personaScores} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    fontSize={10}
                    tick={{ fill: "#4B5563" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFF",
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "10px",
                    }}
                  />
                  <Bar dataKey="score" fill="#1A1A1A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-warm-gray text-xs italic">
                No persona data available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 min-w-0 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Product Performance
            </CardTitle>
            <CardDescription className="text-xs">
              Average score per product/category
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] pt-4">
            {productScores.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productScores} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    fontSize={10}
                    tick={{ fill: "#4B5563" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFF",
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "10px",
                    }}
                  />
                  <Bar dataKey="score" fill="#9CA3AF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-warm-gray text-xs italic">
                No product data available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SkillBar({
  icon: Icon,
  label,
  score,
}: {
  icon: LucideIcon;
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
          {score > 0 ? `${score}%` : "—"}
        </span>
      </div>
      <Progress value={score} className="h-1.5" />
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
  icon: LucideIcon;
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
