"use client";

import { useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";
import type { Session, Persona, Product } from "@/lib/db";
import {
  deleteSession,
  subscribeSessions,
  subscribePersonas,
  subscribeProducts,
  saveSession,
  updateCallSession,
} from "@/lib/db";
import { generateCoachDebrief } from "@/app/actions/api";
import { SessionResults } from "@/components/session-results";
import { useAuth } from "@/context/auth-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [personas, setPersonas] = useState<Record<string, Persona>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [generatingDebriefId, setGeneratingDebriefId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => setLoading(false), 100);

    const handleError = (err: Error) => {
      console.error("History page subscription error:", err);
      setLoading(false);
    };

    const unsubSessions = subscribeSessions(
      user.uid,
      (data) => setSessions(data),
      handleError,
    );

    const unsubPersonas = subscribePersonas(
      user.uid,
      (data) => {
        const personaMap: Record<string, Persona> = {};
        data.forEach((p) => (personaMap[p.id] = p));
        setPersonas(personaMap);
      },
      handleError,
    );

    const unsubProducts = subscribeProducts(
      user.uid,
      (data) => {
        const productMap: Record<string, Product> = {};
        data.forEach((p) => (productMap[p.id] = p));
        setProducts(productMap);
      },
      handleError,
    );

    return () => {
      clearTimeout(timer);
      unsubSessions();
      unsubPersonas();
      unsubProducts();
    };
  }, [user]);

  const handleDelete = async (id: string) => {
    await deleteSession(id);
  };

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
    } catch (error) {
      console.error("Failed to generate debrief from history:", error);
    } finally {
      setGeneratingDebriefId(null);
    }
  };

  const router = useRouter();

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
      <div>
        <span className="text-warm-gray mb-2 block text-xs font-medium tracking-widest uppercase">
          Past Sessions
        </span>
        <h1 className="heading-serif text-charcoal mb-2 text-3xl md:text-4xl lg:text-5xl">
          Session <em>History.</em>
        </h1>
        <p className="text-warm-gray text-base">
          Review past roleplay sessions and track your improvement.
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-border/60 flex flex-col items-center justify-center rounded-2xl bg-white p-12 text-center">
          <div className="bg-cream-dark mb-4 flex size-16 items-center justify-center rounded-2xl">
            <History className="text-warm-gray size-8" />
          </div>
          <CardTitle className="text-charcoal mb-1 text-lg font-semibold">
            No sessions yet
          </CardTitle>
          <CardDescription className="text-warm-gray max-w-sm text-sm">
            Complete your first roleplay session to see results here.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session, i) => {
            const persona = personas[session.personaId];
            const product = products[session.productId];
            const evaluation = session.evaluation;

            const overallScore = evaluation
              ? Math.round(
                  (evaluation.objectionHandlingScore +
                    evaluation.confidenceScore +
                    evaluation.clarityScore) /
                    3,
                )
              : null;

            return (
              <div
                key={session.id}
                onClick={() => router.push(`/dashboard/history/${session.id}`)}
                className="border-border/60 hover:shadow-charcoal/5 group animate-fade-up cursor-pointer rounded-2xl border bg-white p-6 transition-all duration-300 hover:shadow-lg"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-charcoal text-cream flex size-10 items-center justify-center rounded-xl text-sm font-bold">
                          {persona?.name.charAt(0) ||
                            session.personaName?.charAt(0) ||
                            "?"}
                        </div>
                        <div>
                          <p className="text-charcoal text-base font-bold">
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

                      <div className="flex items-center gap-3">
                        <div className="shrink-0 text-right">
                          <span className="text-charcoal text-xl font-bold">
                            {Math.round(
                              ((session.evaluation?.objectionHandlingScore ||
                                0) +
                                (session.evaluation?.confidenceScore || 0) +
                                (session.evaluation?.clarityScore || 0)) /
                                3,
                            ) || 0}
                          </span>
                          <span className="text-warm-gray/60 text-[10px] font-bold">
                            /10
                          </span>
                        </div>
                      </div>
                    </div>

                    {evaluation && (
                      <div className="bg-cream/30 flex items-center gap-6 rounded-xl p-3">
                        <div className="space-y-1">
                          <span className="text-warm-gray-light block text-[9px] font-bold tracking-widest uppercase">
                            Objection
                          </span>
                          <p className="text-charcoal text-sm font-bold">
                            {evaluation.objectionHandlingScore}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-warm-gray-light block text-[9px] font-bold tracking-widest uppercase">
                            Confidence
                          </span>
                          <p className="text-charcoal text-sm font-bold">
                            {evaluation.confidenceScore}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-warm-gray-light block text-[9px] font-bold tracking-widest uppercase">
                            Clarity
                          </span>
                          <p className="text-charcoal text-sm font-bold">
                            {evaluation.clarityScore}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.id);
                      }}
                      className="text-warm-gray-light hover:text-rose-glow p-2 opacity-0 transition-all group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <div className="bg-cream-dark flex size-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-1">
                      <ChevronRight className="text-charcoal size-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
