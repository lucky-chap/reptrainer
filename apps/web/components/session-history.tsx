"use client";

import { useState, useEffect, useCallback } from "react";
import {
  History,
  Clock,
  Target,
  Shield,
  Eye,
  ChevronRight,
  Trash2,
  Sparkles,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Session, Persona, Product } from "@/lib/db";
import {
  getAllSessions,
  getAllPersonas,
  getAllProducts,
  deleteSession,
  deleteCallSession,
  saveSession,
  updateCallSession,
} from "@/lib/db";
import { recalculateUserMetrics } from "@/lib/progress-service";
import { SessionResults } from "@/components/session-results";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { generateCoachDebrief } from "@/app/actions/api";

export function SessionHistory() {
  const { user } = useAuth();
  const { isAdmin } = useTeam();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [personas, setPersonas] = useState<Record<string, Persona>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [allSessions, allPersonas, allProducts] = await Promise.all([
      getAllSessions(user.uid),
      getAllPersonas(user.uid),
      getAllProducts(user.uid),
    ]);

    const personaMap: Record<string, Persona> = {};
    allPersonas.forEach((p) => (personaMap[p.id] = p));

    const productMap: Record<string, Product> = {};
    allProducts.forEach((p) => (productMap[p.id] = p));

    setSessions(allSessions);
    setPersonas(personaMap);
    setProducts(productMap);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (session: Session) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete this session?"))
      return;

    // Attempt both just in case, or we could check where it resides
    await Promise.all([
      deleteSession(session.id),
      deleteCallSession(session.id),
    ]);

    if (session.userId) {
      await recalculateUserMetrics(session.userId);
    }
    loadData();
  };

  const [generatingDebriefId, setGeneratingDebriefId] = useState<string | null>(
    null,
  );

  const handleGenerateDebrief = async (
    e: React.MouseEvent,
    session: Session,
  ) => {
    e.stopPropagation();
    if (generatingDebriefId) return;

    setGeneratingDebriefId(session.id);
    try {
      const persona = personas[session.personaId];
      const debrief = await generateCoachDebrief({
        transcript: session.transcript,
        personaName: persona?.name || session.personaName || "Unknown",
        personaRole: persona?.role || session.personaRole || "AI Persona",
        durationSeconds: session.durationSeconds,
      });

      await Promise.all([
        saveSession({ ...session, debrief }),
        updateCallSession(session.id, { debrief }).catch(() => {}),
      ]);

      await loadData();
    } catch (error) {
      console.error("Failed to generate debrief from history:", error);
    } finally {
      setGeneratingDebriefId(null);
    }
  };

  if (selectedSession) {
    const persona = personas[selectedSession.personaId];
    const product = products[selectedSession.productId];
    return (
      <SessionResults
        session={selectedSession}
        persona={persona || null}
        product={product || null}
        onBack={() => {
          setSelectedSession(null);
          loadData();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-emerald-glow/30 border-t-emerald-glow size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Session History</h2>
        <p className="text-muted-foreground mt-1">
          Review past roleplay sessions and track your improvement.
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card className="glass flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-blue-glow/10 mb-4 flex size-16 items-center justify-center rounded-2xl">
            <History className="text-blue-glow/60 size-8" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No sessions yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Complete your first roleplay session to see results here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((session, i) => {
            const persona = personas[session.personaId];
            const product = products[session.productId];
            const evaluation = session.evaluation;

            const overallScore = evaluation
              ? (evaluation as any).overallScore !== undefined
                ? (evaluation as any).overallScore
                : Math.round((evaluation as any).overall_score / 10)
              : null;

            return (
              <Card
                key={session.id}
                className="glass hover:border-blue-glow/20 group animate-fade-up cursor-pointer p-4 transition-all duration-300"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Score Badge */}
                    <div
                      className={`flex size-12 items-center justify-center rounded-xl text-lg font-bold ${
                        overallScore !== null
                          ? overallScore >= 7
                            ? "bg-emerald-glow/10 text-emerald-glow border-emerald-glow/20 border"
                            : overallScore >= 4
                              ? "bg-amber-glow/10 text-amber-glow border-amber-glow/20 border"
                              : "bg-rose-glow/10 text-rose-glow border-rose-glow/20 border"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {overallScore !== null ? overallScore : "—"}
                    </div>

                    <div>
                      <h3 className="group-hover:text-blue-glow text-sm font-semibold transition-colors">
                        {persona?.name ||
                          session.personaName ||
                          "Unknown Persona"}{" "}
                        {(persona?.role || session.personaRole) && (
                          <span className="text-muted-foreground font-normal">
                            • {persona?.role || session.personaRole}
                          </span>
                        )}
                      </h3>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
                        {product && <span>{product.companyName}</span>}
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

                  <div className="flex items-center gap-3">
                    {evaluation && (
                      <div className="hidden items-center gap-3 text-xs sm:flex">
                        <span className="text-emerald-glow flex items-center gap-1">
                          <Target className="size-3" />
                          {(evaluation as any).objectionHandling
                            ? (evaluation as any).objectionHandling.score
                            : (evaluation as any).objection_handling_score}
                        </span>
                        <span className="text-blue-glow flex items-center gap-1">
                          <Shield className="size-3" />
                          {(evaluation as any).closing
                            ? (evaluation as any).closing.score
                            : (evaluation as any).closing_effectiveness_score}
                        </span>
                      </div>
                    )}

                    {!session.debrief && session.durationSeconds >= 180 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-amber-glow/5 border-amber-glow/30 hover:bg-amber-glow/10 text-amber-glow flex h-7 items-center gap-1.5 px-2.5 text-[10px] font-bold"
                        onClick={(e) => handleGenerateDebrief(e, session)}
                        disabled={generatingDebriefId === session.id}
                      >
                        {generatingDebriefId === session.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        {generatingDebriefId === session.id
                          ? "Generating..."
                          : "Generate Debrief"}
                      </Button>
                    )}

                    {session.debrief && (
                      <Badge className="bg-emerald-glow/10 text-emerald-glow border-emerald-glow/20 flex gap-1 border py-0.5 text-[9px] font-bold uppercase">
                        <Zap className="fill-emerald-glow size-2.5" />
                        Debrief Ready
                      </Badge>
                    )}

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive opacity-0 transition-all group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}

                    <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
