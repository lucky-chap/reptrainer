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
        <div className="size-8 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-2 block">
          Past Sessions
        </span>
        <h1 className="heading-serif text-3xl md:text-4xl lg:text-5xl text-charcoal mb-2">
          Session <em>History.</em>
        </h1>
        <p className="text-warm-gray text-base">
          Review past roleplay sessions and track your improvement.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border/60 p-12 flex flex-col items-center justify-center text-center">
          <div className="size-16 rounded-2xl bg-cream-dark flex items-center justify-center mb-4">
            <History className="size-8 text-warm-gray" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-1">
            No sessions yet
          </h3>
          <p className="text-sm text-warm-gray max-w-sm">
            Complete your first roleplay session to see results here.
          </p>
        </div>
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
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:shadow-charcoal/5 transition-all duration-300 cursor-pointer group animate-fade-up"
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
                            ? "bg-charcoal text-cream"
                            : overallScore >= 4
                              ? "bg-cream-dark text-charcoal"
                              : "bg-cream-dark text-warm-gray"
                          : "bg-cream-dark text-warm-gray"
                      }`}
                    >
                      {overallScore !== null ? overallScore : "—"}
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-charcoal group-hover:text-charcoal-light transition-colors">
                        {persona?.name || "Unknown Persona"}{" "}
                        {persona && (
                          <span className="text-warm-gray font-normal">
                            • {persona.role}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-warm-gray">
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
                        <span className="flex items-center gap-1 text-charcoal">
                          <Target className="size-3" />
                          {evaluation.objectionHandlingScore}
                        </span>
                        <span className="flex items-center gap-1 text-warm-gray">
                          <Shield className="size-3" />
                          {evaluation.confidenceScore}
                        </span>
                        <span className="flex items-center gap-1 text-warm-gray-light">
                          <Eye className="size-3" />
                          {evaluation.clarityScore}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.id);
                      }}
                      className="text-warm-gray-light hover:text-rose-glow opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>

                    <ChevronRight className="size-4 text-warm-gray group-hover:text-charcoal transition-colors" />
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
