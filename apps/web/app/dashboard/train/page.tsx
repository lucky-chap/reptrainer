"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Phone, Target } from "lucide-react";
import type { Persona } from "@/lib/db";
import {
  subscribePersonas,
  subscribeUserMetrics,
  subscribeKnowledgeMetadata,
  type UserMetrics,
  type KnowledgeMetadata,
} from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { RoleplaySession } from "@/components/roleplay-session";
import { TrainingTrackSelector } from "@/components/training-track-selector";
import { useBackgroundGeneration } from "@/hooks/use-background-generation";
import Link from "next/link";
import type { TrainingTrackId, ScenarioTemplate } from "@reptrainer/shared";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TrainStep = "configure" | "track-select" | "session";

function TrainPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [knowledgeMetadata, setKnowledgeMetadata] =
    useState<KnowledgeMetadata | null>(null);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Training track state
  const [step, setStep] = useState<TrainStep>("configure");
  const [selectedTrackId, setSelectedTrackId] =
    useState<TrainingTrackId | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [customScenario, setCustomScenario] = useState<ScenarioTemplate | null>(
    null,
  );

  const { tasks, isGenerating, dismissTask } = useBackgroundGeneration();
  const {
    memberships,
    activeMembership,
    isAdmin,
    loading: teamLoading,
  } = useTeam();
  const teamIds = useMemo(() => memberships.map((m) => m.id), [memberships]);

  // 1. Data Subscriptions (Only depends on User and Team IDs)
  useEffect(() => {
    if (!user || teamLoading) return;

    // Immediately show UI; data will quickly populate from cache
    const timer = setTimeout(() => setLoading(false), 100);

    const handleError = (err: Error) => {
      console.error("Train page subscription error:", err);
      setLoading(false);
    };

    const unsubPersonas = subscribePersonas(
      user.uid,
      teamIds,
      (data) => setPersonas(data),
      handleError,
    );

    const unsubMetrics = subscribeUserMetrics(
      user.uid,
      (data) => setMetrics(data),
      handleError,
    );

    // Subscribe to knowledge metadata if exactly one team selected or just general teamIds
    // For simplicity, we'll subscribe to activeMembership if it exists
    let unsubKb = () => {};
    if (activeMembership?.id) {
      unsubKb = subscribeKnowledgeMetadata(
        activeMembership.id,
        (data) => setKnowledgeMetadata(data),
        handleError,
      );
    }

    return () => {
      clearTimeout(timer);
      unsubPersonas();
      unsubMetrics();
      unsubKb();
    };
  }, [user, teamIds, teamLoading, activeMembership?.id]);

  // 2. Query Parameter Pre-selection (Depends on the data being loaded)
  useEffect(() => {
    if (personas.length === 0) return;

    const queryPersonaId = searchParams.get("personaId");
    if (queryPersonaId && !selectedPersonaId) {
      const persona = personas.find((p) => p.id === queryPersonaId);
      if (persona) {
        setSelectedPersonaId(queryPersonaId);
      }
    }
  }, [searchParams, personas, selectedPersonaId]);

  const handleStartRoleplay = () => {
    if (!selectedPersonaId) return;
    const persona = personas.find((p) => p.id === selectedPersonaId);
    if (persona) {
      setActivePersona(persona);
      // Move to track selection step
      setStep("track-select");
    }
  };

  const handleTrackSelected = (
    trackId: TrainingTrackId,
    scenarioId: string,
    passedCustomScenario?: ScenarioTemplate,
  ) => {
    setSelectedTrackId(trackId);
    setSelectedScenarioId(scenarioId);
    setCustomScenario(passedCustomScenario || null);
    setStep("session");
  };

  const handleSkipTrack = () => {
    setSelectedTrackId(null);
    setSelectedScenarioId(null);
    setCustomScenario(null);
    setStep("session");
  };

  const handleBackToConfig = () => {
    setActivePersona(null);
    setSelectedTrackId(null);
    setSelectedScenarioId(null);
    setCustomScenario(null);
    setStep("configure");
  };

  // ─── Step: Training Track Selection ───────────────────────────────────
  if (step === "track-select" && activePersona) {
    return (
      <>
        <div className="mx-auto max-w-4xl py-6">
          <TrainingTrackSelector
            onSelectScenario={handleTrackSelected}
            onSkip={handleSkipTrack}
            totalSessions={metrics?.totalCalls ?? 0}
          />
        </div>
      </>
    );
  }

  // ─── Step: Active Roleplay Session ────────────────────────────────────
  if (step === "session" && activePersona) {
    return (
      <>
        <RoleplaySession
          persona={activePersona}
          knowledgeMetadata={knowledgeMetadata || undefined}
          teamId={activePersona.teamId}
          trackId={selectedTrackId ?? undefined}
          scenarioId={selectedScenarioId ?? undefined}
          customScenario={customScenario ?? undefined}
          onBack={handleBackToConfig}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  // ─── Step: Configure Session ──────────────────────────────────────────
  return (
    <>
      <div className="animate-fade-up space-y-8">
        {/* Page header */}
        <div>
          <span className="text-warm-gray mb-2 block text-xs font-medium tracking-widest uppercase">
            {isAdmin ? "Team Training" : "Your Training"}
          </span>
          <h1 className="heading-serif text-charcoal mb-2 text-3xl md:text-4xl lg:text-5xl">
            {isAdmin ? (
              <>
                Team <em>Training.</em>
              </>
            ) : (
              <>
                Personal <em>Practice.</em>
              </>
            )}
          </h1>
          <p className="text-warm-gray max-w-xl text-base">
            {isAdmin
              ? "Train yourself or your team with AI buyer personas. Practice objection handling, closing, and more to drive collective performance."
              : "Sharpen your sales skills with AI buyer personas. Practice objection handling and closing in a low-stakes environment."}
          </p>
        </div>

        {/* Configure Section */}
        <Card className="border-border/60 overflow-hidden rounded-2xl bg-white shadow-sm">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-cream-dark flex size-12 items-center justify-center rounded-2xl">
                <Phone className="text-charcoal size-6" />
              </div>
              <div>
                <CardTitle className="text-charcoal text-lg font-semibold">
                  Configure Session
                </CardTitle>
                <CardDescription className="text-warm-gray text-sm">
                  Select who you want to pitch to, and what you are pitching.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 pt-4">
            {(!knowledgeMetadata && !isAdmin) || personas.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-warm-gray mb-6 text-sm">
                  {isAdmin
                    ? "You need at least one persona and processed knowledge to start a session."
                    : "Your team hasn't set up any training knowledge or personas yet. Please notify your team leader to create them so you can start practicing."}
                </p>
                {isAdmin && (
                  <div className="flex items-center justify-center gap-4">
                    <Button asChild variant="brand" className="h-12 px-6">
                      <Link href="/dashboard/knowledge">Manage Knowledge</Link>
                    </Button>
                    <Button
                      asChild
                      variant="brandOutline"
                      className="h-12 px-6"
                    >
                      <Link href="/dashboard/personas">Manage Personas</Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Persona Select (Now top level) */}
                <div className="flex-1 space-y-2">
                  <label className="text-charcoal text-xs font-medium tracking-wider uppercase opacity-60">
                    Choose Your Partner (Persona)
                  </label>
                  <select
                    value={selectedPersonaId || ""}
                    onChange={(e) =>
                      setSelectedPersonaId(e.target.value || null)
                    }
                    className="border-border/60 bg-cream text-charcoal focus:ring-charcoal/20 disabled:bg-warm-gray/5 h-12 w-full rounded-xl border px-4 text-sm transition-all focus:ring-2 focus:outline-none disabled:cursor-not-allowed"
                  >
                    <option value="">Select a persona…</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="text-warm-gray text-xs font-medium">
                    {knowledgeMetadata ? (
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Using {knowledgeMetadata.productCategory} Knowledge
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-rose-500">
                        <span className="size-2 rounded-full bg-rose-500" />
                        No processed knowledge found for this team.
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleStartRoleplay}
                    disabled={
                      !selectedPersonaId ||
                      !knowledgeMetadata ||
                      tasks.some(
                        (t) =>
                          t.personaId === selectedPersonaId &&
                          t.status === "generating",
                      )
                    }
                    variant="brand"
                    className="h-12 min-w-[220px] px-6"
                  >
                    <Target className="mr-2 size-4" />
                    {tasks.some(
                      (t) =>
                        t.personaId === selectedPersonaId &&
                        t.status === "generating",
                    )
                      ? "Generating Avatar…"
                      : "Choose Track & Start"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function TrainPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
        </div>
      }
    >
      <TrainPageContent />
    </Suspense>
  );
}
