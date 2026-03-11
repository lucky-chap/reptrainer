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
import type { Session, Persona } from "@/lib/db";
import {
  deleteSession,
  deleteCallSession,
  subscribeSessions,
  subscribePersonas,
  saveSession,
  updateCallSession,
  getUserTeams,
  getTeamMembers,
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
  const [teamMembers, setTeamMembers] = useState<Record<string, any>>({});
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

      if (isAdmin && teamIds.length > 0) {
        try {
          const membersPromises = teamIds.map((id) => getTeamMembers(id));
          const membersArrays = await Promise.all(membersPromises);
          const membersList = membersArrays.flat();
          const memberMap: Record<string, any> = {};
          membersList.forEach((m) => {
            memberMap[m.userId] = m;
          });
          setTeamMembers(memberMap);
        } catch (err) {
          console.error("Failed to load team members:", err);
        }
      }

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

      return () => {
        unsubSessions();
        unsubPersonas();
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

  const handleDelete = async (id: string, userId?: string, teamId?: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete this session?"))
      return;

    await Promise.all([deleteSession(id), deleteCallSession(id)]);

    if (userId && teamId) {
      await recalculateUserMetrics(userId, teamId);
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
            const evaluation = session.evaluation;
            const memberInfo = teamMembers[session.userId];

            const overallScore = evaluation ? getOverallScore(evaluation) : 0;

            return (
              <div
                key={session.id}
                onClick={() => router.push(`/dashboard/history/${session.id}`)}
                className="border-border/60 hover:shadow-charcoal/5 group animate-fade-up cursor-pointer rounded-2xl border bg-white p-6 transition-all duration-300 hover:shadow-lg"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex w-full flex-col gap-3">
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-charcoal text-cream flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                          {isAdmin ? (
                            memberInfo?.userAvatarUrl ? (
                              <Image
                                src={memberInfo.userAvatarUrl}
                                alt={
                                  memberInfo.userName ||
                                  session.userName ||
                                  "Unknown"
                                }
                                className="h-full w-full rounded-full object-cover"
                                width={48}
                                height={48}
                              />
                            ) : (
                              (session.userName?.charAt(0) || "U").toUpperCase()
                            )
                          ) : persona?.avatarUrl ? (
                            <Image
                              src={persona?.avatarUrl}
                              alt={persona?.name}
                              className="h-full w-full rounded-full object-cover"
                              width={48}
                              height={48}
                            />
                          ) : (
                            (
                              persona?.name.charAt(0) ||
                              session.personaName?.charAt(0) ||
                              "?"
                            ).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-charcoal flex items-center gap-2 text-base font-bold">
                            {isAdmin
                              ? session.userName || "Unknown Member"
                              : persona?.name ||
                                session.personaName ||
                                "Unknown"}

                            {isAdmin && (
                              <span className="text-warm-gray text-xs font-medium">
                                w/{" "}
                                {persona?.name ||
                                  session.personaName ||
                                  "Unknown"}
                              </span>
                            )}
                          </p>
                          <div className="text-warm-gray mt-1 flex items-center gap-4 text-xs font-medium">
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3.5" />
                              {Math.floor(session.durationSeconds / 60)}m{" "}
                              {session.durationSeconds % 60}s
                            </span>
                            <span className="flex items-center gap-1.5">
                              {new Date(session.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mr-4 flex items-center gap-3">
                        <div className="shrink-0 text-right">
                          <Badge>{overallScore}</Badge>
                          <span className="text-warm-gray/60 ml-2 text-[10px] font-bold">
                            Points
                          </span>
                        </div>
                      </div>
                    </div>
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
                      <Button
                        variant={"ghost"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(
                            session.id,
                            session.userId,
                            session.teamId,
                          );
                        }}
                        className="text-warm-gray-light hover:text-rose-glow p-2 opacity-0 transition-all group-hover:opacity-100"
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
