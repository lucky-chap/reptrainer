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
} from "lucide-react";
import type { Session, Persona, Product } from "@/lib/db";
import {
  deleteSession,
  subscribeSessions,
  subscribePersonas,
  subscribeProducts,
} from "@/lib/db";
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
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (selectedSession) {
    const persona = personas[selectedSession.personaId];
    const product = products[selectedSession.productId];
    if (persona) {
      return (
        <SessionResults
          session={selectedSession}
          persona={persona}
          product={product || null}
          onBack={() => setSelectedSession(null)}
        />
      );
    }
  }

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
                onClick={() => setSelectedSession(session)}
                className="border-border/60 hover:shadow-charcoal/5 group animate-fade-up cursor-pointer rounded-2xl border bg-white p-6 transition-all duration-300 hover:shadow-lg"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    {/* Score Badge */}
                    <div
                      className={cn(
                        "flex size-14 items-center justify-center rounded-2xl text-xl font-bold shadow-sm transition-transform duration-300 group-hover:scale-105",
                        overallScore !== null
                          ? overallScore >= 7
                            ? "bg-charcoal text-cream"
                            : overallScore >= 4
                              ? "bg-cream-dark text-charcoal border-border/40 border"
                              : "bg-cream text-warm-gray border-border/40 border"
                          : "bg-cream text-warm-gray border-border/20 border",
                      )}
                    >
                      {overallScore !== null ? overallScore : "—"}
                    </div>

                    <div>
                      <h3 className="text-charcoal group-hover:text-charcoal-light text-base font-semibold transition-colors">
                        {persona?.name || "Unknown Persona"}{" "}
                        {persona && (
                          <span className="text-warm-gray font-normal">
                            • {persona.role}
                          </span>
                        )}
                      </h3>
                      <div className="text-warm-gray mt-1 flex items-center gap-4 text-xs">
                        {product && (
                          <span className="bg-cream-dark text-charcoal rounded-full px-2.5 py-0.5 font-medium">
                            {product.companyName}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {Math.floor(session.durationSeconds / 60)}m{" "}
                          {session.durationSeconds % 60}s
                        </span>
                        <span>
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    {evaluation && (
                      <div className="hidden items-center gap-4 border-r pr-6 sm:flex">
                        <div className="text-center">
                          <p className="text-warm-gray text-[10px] font-bold tracking-tighter uppercase">
                            Obj
                          </p>
                          <p className="text-charcoal text-sm font-bold">
                            {evaluation.objectionHandlingScore}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-warm-gray text-[10px] font-bold tracking-tighter uppercase">
                            Conf
                          </p>
                          <p className="text-charcoal text-sm font-bold">
                            {evaluation.confidenceScore}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-warm-gray text-[10px] font-bold tracking-tighter uppercase">
                            Clar
                          </p>
                          <p className="text-charcoal text-sm font-bold">
                            {evaluation.clarityScore}
                          </p>
                        </div>
                      </div>
                    )}

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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
