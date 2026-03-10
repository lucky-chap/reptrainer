"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Brain,
  FileText,
  PlusCircle,
  ChevronRight,
} from "lucide-react";
import type { Session, Persona } from "@/lib/db";
import {
  subscribePersonas,
  subscribeSessions,
  subscribeUserMetrics,
  getUserTeams,
} from "@/lib/db";
import { subscribeKnowledgeBase } from "@/lib/db/knowledge";
import { type UserMetrics, type KnowledgeBase } from "@reptrainer/shared";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { MemberDashboard } from "@/components/dashboard/member-dashboard";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const { isAdmin, currentTeam } = useTeam();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const fetchTeamsAndSubscribe = async () => {
      try {
        const teams = await getUserTeams(user.uid);
        const ids = teams.map((t) => t.id);
        setTeamIds(ids);

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

        const unsubKb = currentTeam
          ? subscribeKnowledgeBase(
              currentTeam.id,
              (data) => setKb(data),
              handleError,
            )
          : () => {};

        const unsubPersonas = subscribePersonas(
          user.uid,
          ids,
          (data) => setPersonas(data),
          handleError,
        );

        const unsubSessions = subscribeSessions(
          user.uid,
          isAdmin ? ids : [],
          (data) => setSessions(data),
          handleError,
        );

        const unsubMetrics = subscribeUserMetrics(
          user.uid,
          (data) => setMetrics(data),
          handleError,
        );

        return () => {
          unsubKb();
          unsubPersonas();
          unsubSessions();
          unsubMetrics();
        };
      } catch (err) {
        console.error("Error fetching teams:", err);
        setLoading(false);
      }
    };

    const loadingTimer = setTimeout(() => setLoading(false), 100);
    const cleanupPromise = fetchTeamsAndSubscribe();

    return () => {
      clearTimeout(loadingTimer);
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [user]);

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

  if (currentTeam && !currentTeam.hasKnowledgeBase) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-charcoal/5 ring-charcoal/2 mb-6 rounded-full p-4 ring-8">
          <Brain className="text-charcoal/40 size-12" />
        </div>
        <h2 className="text-charcoal mb-3 text-2xl font-bold">
          Knowledge Base Required
        </h2>
        <p className="text-warm-gray mb-8 max-w-md leading-relaxed">
          To generate training personas and simulations, your team first needs
          to upload its knowledge base (product docs, playbooks, pitch decks).
        </p>
        <Button
          onClick={() => router.push("/dashboard/knowledge")}
          size="lg"
          className="bg-charcoal text-cream hover:bg-charcoal-light rounded-full px-8 shadow-md"
        >
          Upload Knowledge
          <ChevronRight className="ml-2 size-4" />
        </Button>
      </div>
    );
  }

  return isAdmin ? (
    <AdminDashboard
      sessions={sessions}
      personas={personas}
      team={currentTeam}
      metrics={metrics}
    />
  ) : (
    <MemberDashboard
      user={user}
      sessions={sessions}
      personas={personas}
      team={currentTeam}
      metrics={metrics}
    />
  );
}
