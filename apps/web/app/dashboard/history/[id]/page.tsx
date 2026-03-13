"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import {
  subscribeSessions,
  subscribePersonas,
  subscribeKnowledgeMetadata,
  subscribeCallSessionDoc,
} from "@/lib/db";
import type { Session, Persona, KnowledgeMetadata, CallSession } from "@/lib/db";
import { SessionResults } from "@/components/session-results";

interface SessionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const { memberships } = useTeam();
  const router = useRouter();

  const teamIds = useMemo(() => memberships.map((m) => m.id), [memberships]);

  const [session, setSession] = useState<Session | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [knowledgeMetadata, setKnowledgeMetadata] =
    useState<KnowledgeMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const handleError = (err: Error) => {
      console.error("Session detail subscription error:", err);
      setLoading(false);
    };

    // Subscribing to sessions to find the one matching the ID
    const unsubSessions = subscribeSessions(
      user.uid,
      teamIds,
      (sessions) => {
        const found = sessions.find((s) => s.id === id);
        if (found) {
          setSession(found);
          setLoading(false);
        } else {
          // If session not found after some time, might be deleted or invalid
          setLoading(false);
        }
      },
      handleError,
    );

    const unsubPersonas = subscribePersonas(
      user.uid,
      teamIds,
      (personas) => {
        // We'll update the persona whenever it changes
        if (session?.personaId) {
          const p = personas.find((p) => p.id === session.personaId);
          if (p) setPersona(p);
        }
      },
      handleError,
    );

    const unsubKnowledge = subscribeKnowledgeMetadata(
      session?.teamId || teamIds[0] || "",
      (data) => setKnowledgeMetadata(data),
      handleError,
    );

    // Watch callSessions doc for server-side debrief updates
    const unsubCallSession = subscribeCallSessionDoc(
      id,
      (callSession) => {
        if (callSession?.debriefStatus === "ready" && callSession.debrief) {
          setSession((prev) =>
            prev ? { ...prev, debrief: callSession.debrief } : prev,
          );
        }
      },
      handleError,
    );

    return () => {
      unsubSessions();
      unsubPersonas();
      unsubKnowledge();
      unsubCallSession();
    };
  }, [user, id, teamIds, session?.personaId, session?.teamId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <h2 className="text-charcoal text-xl font-bold">Session not found</h2>
        <button
          onClick={() => router.push("/dashboard/history")}
          className="text-warm-gray hover:text-charcoal underline"
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12">
      <SessionResults
        session={session}
        persona={persona}
        productCategory={knowledgeMetadata?.productCategory}
        onBack={() => router.push("/dashboard/history")}
      />
    </div>
  );
}
