"use client";

import { useState, useEffect, useCallback } from "react";
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
import { getAllSessions, getAllPersonas, getAllProducts } from "@/lib/db";
import { useAuth } from "@/context/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    const [allSessions, allPersonas, allProducts] = await Promise.all([
      getAllSessions(user.uid),
      getAllPersonas(user.uid),
      getAllProducts(user.uid),
    ]);
    setSessions(allSessions);
    setPersonas(allPersonas);
    setProducts(allProducts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Compute stats
  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const evaluatedSessions = sessions.filter((s) => s.evaluation);
  const avgScore =
    evaluatedSessions.length > 0
      ? Math.round(
          evaluatedSessions.reduce((sum, s) => {
            const e = s.evaluation!;
            return (
              sum +
              (e.objectionHandlingScore + e.confidenceScore + e.clarityScore) /
                3
            );
          }, 0) / evaluatedSessions.length,
        )
      : 0;

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

  // Week-over-week scores for chart
  const weekScores = recentSessions
    .slice()
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
        <div className="size-8 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-2 block">
            Dashboard
          </span>
          <h1 className="heading-serif text-3xl md:text-4xl lg:text-5xl text-charcoal">
            Welcome <em>{user?.displayName?.split(" ")[0] || "back"}.</em>
          </h1>
          <p className="text-warm-gray mt-2 text-base">
            Here&apos;s how your sales training is progressing.
          </p>
        </div>
        <Link
          href="/dashboard/train"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors group self-start md:self-auto"
        >
          <Swords className="size-4" />
          Start training
          <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border/60 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-charcoal">
                Performance Trend
              </h3>
              <p className="text-sm text-warm-gray">
                Your last {weekScores.length} sessions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-warm-gray" />
            </div>
          </div>

          {weekScores.length > 0 ? (
            <div className="flex items-end gap-3 h-40">
              {weekScores.map((score, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span className="text-xs font-medium text-charcoal">
                    {score > 0 ? score : "—"}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-700"
                    style={{
                      height: `${score > 0 ? (score / 10) * 100 : 10}%`,
                      backgroundColor:
                        score >= 7
                          ? "var(--color-charcoal)"
                          : score >= 4
                            ? "var(--color-warm-gray-light)"
                            : "var(--color-cream-dark)",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-warm-gray">
                Complete sessions to see your performance trend
              </p>
            </div>
          )}
        </div>

        {/* Skill breakdown */}
        <div className="bg-white rounded-2xl border border-border/60 p-8">
          <h3 className="text-base font-semibold text-charcoal mb-1">
            Skill Breakdown
          </h3>
          <p className="text-sm text-warm-gray mb-6">Average scores</p>

          <div className="space-y-5">
            <SkillBar
              icon={Target}
              label="Objection Handling"
              score={avgObjection}
              color="bg-charcoal"
            />
            <SkillBar
              icon={Zap}
              label="Confidence"
              score={avgConfidence}
              color="bg-warm-gray"
            />
            <SkillBar
              icon={TrendingUp}
              label="Clarity"
              score={avgClarity}
              color="bg-warm-gray-light"
            />
          </div>

          {evaluatedSessions.length === 0 && (
            <p className="text-xs text-warm-gray mt-6 text-center">
              Complete evaluated sessions to see your skill breakdown
            </p>
          )}
        </div>
      </div>

      {/* Recent activity and quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sessions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border/60 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-charcoal">
              Recent Sessions
            </h3>
            <Link
              href="/dashboard/history"
              className="text-sm text-warm-gray hover:text-charcoal transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map((session) => {
                const persona = personas.find(
                  (p) => p.id === session.personaId,
                );
                const score = session.evaluation
                  ? Math.round(
                      (session.evaluation.objectionHandlingScore +
                        session.evaluation.confidenceScore +
                        session.evaluation.clarityScore) /
                        3,
                    )
                  : null;

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-3 border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-cream-dark flex items-center justify-center font-bold text-sm text-charcoal">
                        {persona?.name.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {persona?.name || "Unknown"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-warm-gray">
                          <span className="flex items-center gap-1">
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
                    {score !== null && (
                      <span
                        className={`text-lg font-bold ${
                          score >= 7
                            ? "text-charcoal"
                            : score >= 4
                              ? "text-warm-gray"
                              : "text-warm-gray-light"
                        }`}
                      >
                        {score}
                        <span className="text-xs text-warm-gray font-normal">
                          /10
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-warm-gray mb-4">
                No sessions yet. Start your first training session.
              </p>
              <Link
                href="/dashboard/train"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors"
              >
                Begin training
              </Link>
            </div>
          )}
        </div>

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
    <div className="bg-white rounded-2xl border border-border/60 p-6 hover:shadow-lg hover:shadow-charcoal/5 transition-all duration-300">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-4 text-warm-gray" />
        <span className="text-xs font-medium uppercase tracking-wider text-warm-gray">
          {label}
        </span>
      </div>
      <p className="heading-serif text-2xl md:text-3xl text-charcoal mb-1">
        {value}
      </p>
      <p className="text-xs text-warm-gray">{subtext}</p>
    </div>
  );
}

function SkillBar({
  icon: Icon,
  label,
  score,
  color,
}: {
  icon: React.ElementType;
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-sm font-medium text-charcoal">
          <Icon className="size-4 text-warm-gray" />
          {label}
        </span>
        <span className="text-sm text-warm-gray">
          {score > 0 ? `${score}/10` : "—"}
        </span>
      </div>
      <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000`}
          style={{ width: `${score > 0 ? (score / 10) * 100 : 0}%` }}
        />
      </div>
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
    <Link
      href={href}
      className="block bg-white rounded-2xl border border-border/60 p-6 hover:shadow-lg hover:shadow-charcoal/5 transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-xl bg-cream-dark flex items-center justify-center group-hover:bg-charcoal transition-colors duration-300">
          <Icon className="size-5 text-charcoal group-hover:text-cream transition-colors duration-300" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-charcoal mb-0.5 group-hover:text-charcoal-light transition-colors">
            {title}
          </h4>
          <p className="text-xs text-warm-gray">{description}</p>
        </div>
        <ArrowRight className="size-4 text-warm-gray group-hover:text-charcoal group-hover:translate-x-0.5 transition-all mt-0.5" />
      </div>
    </Link>
  );
}
