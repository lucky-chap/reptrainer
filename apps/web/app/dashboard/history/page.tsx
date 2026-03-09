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
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Session, Persona, Product } from "@/lib/db";
import {
  deleteSession,
  deleteCallSession,
  subscribeSessions,
  subscribePersonas,
  subscribeProducts,
  saveSession,
  updateCallSession,
  getUserTeams,
} from "@/lib/db";
import { recalculateUserMetrics } from "@/lib/progress-service";
import { generateCoachDebrief } from "@/app/actions/api";
import { SessionResults } from "@/components/session-results";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
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
import { getOverallScore } from "@/lib/analytics-utils";

export default function HistoryPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [personas, setPersonas] = useState<Record<string, Persona>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [generatingDebriefId, setGeneratingDebriefId] = useState<string | null>(
    null,
  );
  const [teams, setTeams] = useState<any[]>([]);
  const { isAdmin } = useTeam();

  useEffect(() => {
    if (!user) return;

    const fetchTeamsAndSubscribe = async () => {
      const userTeams = await getUserTeams(user.uid);
      setTeams(userTeams);
      const teamIds = userTeams.map((t) => t.id);

      const unsubSessions = subscribeSessions(
        user.uid,
        isAdmin ? teamIds : [],
        (data) => setSessions(data),
        handleError,
      );

      const unsubPersonas = subscribePersonas(
        user.uid,
        teamIds,
        (data) => {
          const personaMap: Record<string, Persona> = {};
          data.forEach((p) => (personaMap[p.id] = p));
          setPersonas(personaMap);
        },
        handleError,
      );

      const unsubProducts = subscribeProducts(
        user.uid,
        teamIds,
        (data) => {
          const productMap: Record<string, Product> = {};
          data.forEach((p) => (productMap[p.id] = p));
          setProducts(productMap);
        },
        handleError,
      );

      return () => {
        unsubSessions();
        unsubPersonas();
        unsubProducts();
      };
    };

    const timer = setTimeout(() => setLoading(false), 100);

    const handleError = (err: Error) => {
      console.error("History page subscription error:", err);
      setLoading(false);
    };

    const cleanupPromise = fetchTeamsAndSubscribe();

    return () => {
      clearTimeout(timer);
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [user]);

  const handleDelete = async (id: string, userId?: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete this session?"))
      return;

    await Promise.all([deleteSession(id), deleteCallSession(id)]);

    if (userId) {
      await recalculateUserMetrics(userId);
    }
  };

  const handleMoveToTeam = async (sessionId: string, teamId: string) => {
    try {
      // Both session and callSession might need update depending on how they are used
      // But usually 'sessions' collection is the source of truth for history
      const { db, updateDoc } = await import("@/lib/db");
      const { doc } = await import("firebase/firestore");
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        teamId: teamId,
      });
      // Also update callSessions for consistency
      const callSessionRef = doc(db, "callSessions", sessionId);
      await updateDoc(callSessionRef, {
        teamId: teamId,
      }).catch(() => {}); // ignore if doesn't exist
    } catch (err) {
      console.error("Error sharing session with team:", err);
    }
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
          {isAdmin ? "Team History" : "Your History"}
        </span>
        <h1 className="heading-serif text-charcoal mb-2 text-3xl md:text-4xl lg:text-5xl">
          {isAdmin ? (
            <>
              Team <em>History.</em>
            </>
          ) : (
            <>
              Your <em>Performance.</em>
            </>
          )}
        </h1>
        <p className="text-warm-gray text-base">
          {isAdmin
            ? "Review your team's past roleplay sessions and track collective improvement."
            : "Review your past roleplay sessions and track your personal improvement over time."}
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
            Complete your team's first roleplay session to see results here.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session, i) => {
            const persona = personas[session.personaId];
            const product = products[session.productId];
            const evaluation = session.evaluation;

            const overallScore = evaluation ? getOverallScore(evaluation) : 0;

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
                          {persona?.avatarUrl ? (
                            <div className="h-full w-full rounded-full">
                              <Image
                                src={persona?.avatarUrl}
                                alt={persona?.name}
                                className="h-full w-full rounded-full object-cover"
                                width={48}
                                height={48}
                              />
                            </div>
                          ) : (
                            persona?.name.charAt(0) ||
                            session.personaName?.charAt(0) ||
                            "?"
                          )}
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
                            {overallScore}
                          </span>
                          <span className="text-warm-gray/60 text-[10px] font-bold">
                            Points
                          </span>
                        </div>
                      </div>
                    </div>

                    {evaluation && (
                      <div className="bg-cream/30 flex items-center gap-6 rounded-xl p-3">
                        <div className="space-y-1">
                          <span className="text-warm-gray-light block text-[9px] font-bold tracking-widest uppercase">
                            Disc.
                          </span>
                          <p className="text-charcoal text-sm font-bold">
                            {(evaluation as any).discovery?.score ?? 0}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-warm-gray-light block text-[9px] font-bold tracking-widest uppercase">
                            Obj.
                          </span>
                          <p className="text-charcoal text-sm font-bold">
                            {(evaluation as any).objectionHandling?.score ?? 0}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-warm-gray-light block text-[9px] font-bold tracking-widest uppercase">
                            Pos.
                          </span>
                          <p className="text-charcoal text-sm font-bold">
                            {(evaluation as any).productPositioning?.score ?? 0}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-warm-gray-light block text-[9px] font-bold tracking-widest uppercase">
                            List.
                          </span>
                          <p className="text-charcoal text-sm font-bold">
                            {(evaluation as any).activeListening?.score ?? 0}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-warm-gray-light block text-[9px] font-bold tracking-widest uppercase">
                            Close
                          </span>
                          <p className="text-charcoal text-sm font-bold">
                            {(evaluation as any).closing?.score ?? 0}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!session.teamId && teams.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="text-warm-gray-light hover:text-charcoal p-2 opacity-0 transition-all group-hover:opacity-100"
                          >
                            <Users className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-xl"
                        >
                          <DropdownMenuLabel className="text-[10px] font-bold tracking-widest uppercase">
                            Share with Team
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {teams.map((team) => (
                            <DropdownMenuItem
                              key={team.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToTeam(session.id, team.id);
                              }}
                              className="cursor-pointer text-xs font-medium"
                            >
                              {team.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.id, session.userId);
                        }}
                        className="text-warm-gray-light hover:text-rose-glow p-2 opacity-0 transition-all group-hover:opacity-100"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
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
