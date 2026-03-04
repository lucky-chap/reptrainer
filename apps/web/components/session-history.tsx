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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Session, Persona, Product } from "@/lib/db";
import {
  getAllSessions,
  getAllPersonas,
  getAllProducts,
  deleteSession,
} from "@/lib/db";
import { SessionResults } from "@/components/session-results";
import { useAuth } from "@/context/auth-context";

export function SessionHistory() {
  const { user } = useAuth();
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

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    loadData();
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
        <div className="size-8 border-2 border-emerald-glow/30 border-t-emerald-glow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Session History</h2>
        <p className="text-muted-foreground mt-1">
          Review past roleplay sessions and track your improvement.
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center glass">
          <div className="size-16 rounded-2xl bg-blue-glow/10 flex items-center justify-center mb-4">
            <History className="size-8 text-blue-glow/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No sessions yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
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
              ? Math.round(
                  (evaluation.objectionHandlingScore +
                    evaluation.confidenceScore +
                    evaluation.clarityScore) /
                    3,
                )
              : null;

            return (
              <Card
                key={session.id}
                className="p-4 glass hover:border-blue-glow/20 transition-all duration-300 cursor-pointer group animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Score Badge */}
                    <div
                      className={`size-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                        overallScore !== null
                          ? overallScore >= 7
                            ? "bg-emerald-glow/10 text-emerald-glow border border-emerald-glow/20"
                            : overallScore >= 4
                              ? "bg-amber-glow/10 text-amber-glow border border-amber-glow/20"
                              : "bg-rose-glow/10 text-rose-glow border border-rose-glow/20"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {overallScore !== null ? overallScore : "—"}
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-blue-glow transition-colors">
                        {persona?.name || "Unknown Persona"}{" "}
                        {persona && (
                          <span className="text-muted-foreground font-normal">
                            • {persona.role}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
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
                      <div className="hidden sm:flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-emerald-glow">
                          <Target className="size-3" />
                          {evaluation.objectionHandlingScore}
                        </span>
                        <span className="flex items-center gap-1 text-blue-glow">
                          <Shield className="size-3" />
                          {evaluation.confidenceScore}
                        </span>
                        <span className="flex items-center gap-1 text-amber-glow">
                          <Eye className="size-3" />
                          {evaluation.clarityScore}
                        </span>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>

                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
