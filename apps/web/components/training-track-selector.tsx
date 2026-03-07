"use client";

import { useState } from "react";
import {
  GraduationCap,
  Shield,
  Building2,
  Trophy,
  ChevronRight,
  ArrowLeft,
  Zap,
  Target,
  Star,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  TRAINING_TRACKS,
  type TrainingTrack,
  type ScenarioTemplate,
  type TrainingTrackId,
} from "@reptrainer/shared";

const TRACK_ICONS: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap className="size-6" />,
  Shield: <Shield className="size-6" />,
  Building2: <Building2 className="size-6" />,
  Trophy: <Trophy className="size-6" />,
  Zap: <Zap className="size-6" />,
};

const DIFFICULTY_LABELS = ["Easy", "Medium", "Hard"];
const DIFFICULTY_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

interface TrainingTrackSelectorProps {
  onSelectScenario: (
    trackId: TrainingTrackId,
    scenarioId: string,
    customScenario?: ScenarioTemplate,
  ) => void;
  onSkip: () => void;
  totalSessions: number;
}

export function TrainingTrackSelector({
  onSelectScenario,
  onSkip,
  totalSessions,
}: TrainingTrackSelectorProps) {
  const [selectedTrack, setSelectedTrack] = useState<TrainingTrack | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  if (selectedTrack) {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTrack(null)}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back to Tracks
          </Button>
        </div>

        <div className="mb-6 text-center">
          <div className="bg-cream mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2">
            {TRACK_ICONS[selectedTrack.icon]}
            <span className="text-charcoal text-sm font-semibold">
              {selectedTrack.name}
            </span>
          </div>
          <h2 className="heading-serif text-charcoal mb-2 text-2xl">
            Choose a Scenario
          </h2>
          <p className="text-warm-gray mx-auto max-w-md text-sm">
            Each scenario is designed to test specific skills. The AI will adapt
            its behavior accordingly.
          </p>
        </div>

        <div className="mx-auto grid max-w-2xl gap-4">
          {selectedTrack.id === "adaptive" ? (
            <Card className="border-border/60 relative mt-4 overflow-hidden bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-4">
                <div className="bg-cream mb-2 rounded-full p-4">
                  <Star className="text-charcoal h-8 w-8" />
                </div>
                <h3 className="text-charcoal heading-serif text-xl font-bold">
                  Generate Custom Scenario
                </h3>
                <p className="text-warm-gray mb-4 text-sm leading-relaxed">
                  We'll analyze your past performance metrics to generate a
                  unique roleplay scenario specifically designed to target your
                  weaknesses and challenge your strengths.
                </p>
                <Button
                  disabled={isGenerating || !user}
                  onClick={async () => {
                    if (!user) return;
                    setIsGenerating(true);
                    try {
                      const res = await fetch("/api/scenarios/adaptive", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.uid }),
                      });
                      if (!res.ok) throw new Error("Failed to generate");
                      const scenario: ScenarioTemplate = await res.json();
                      onSelectScenario("adaptive", scenario.id, scenario);
                    } catch (err) {
                      console.error(err);
                      // In a real app we'd show a toast here
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                  className="h-12 w-full px-8 sm:w-auto"
                  variant="brand"
                >
                  {isGenerating ? "Generating..." : "Generate Scenario"}
                </Button>
              </div>
            </Card>
          ) : (
            selectedTrack.scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() =>
                  onSelectScenario(
                    selectedTrack.id as TrainingTrackId,
                    scenario.id,
                  )
                }
                className="group text-left"
              >
                <Card className="border-border/60 hover:border-charcoal/30 rounded-2xl border bg-white p-6 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-charcoal text-base font-semibold">
                          {scenario.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${DIFFICULTY_COLORS[scenario.difficulty - 1]}`}
                        >
                          {DIFFICULTY_LABELS[scenario.difficulty - 1]}
                        </span>
                      </div>
                      <p className="text-warm-gray mb-4 text-sm leading-relaxed">
                        {scenario.description}
                      </p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-2">
                        {scenario.expectedSkills.map((skill) => (
                          <span
                            key={skill}
                            className="bg-cream/80 text-charcoal/80 border-border/30 rounded-lg border px-2.5 py-1 text-[11px] font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Evaluation Weights */}
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-warm-gray-light text-[10px] font-semibold tracking-wider uppercase">
                          Focus:
                        </span>
                        {Object.entries(scenario.evaluationWeighting)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 3)
                          .map(([key, weight]) => (
                            <span
                              key={key}
                              className="text-warm-gray text-[10px] font-medium"
                            >
                              {key.replace(/_/g, " ")} ({weight}%)
                            </span>
                          ))}
                      </div>
                    </div>

                    <ChevronRight className="text-warm-gray group-hover:text-charcoal mt-1 size-5 shrink-0 transition-colors" />
                  </div>
                </Card>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="mb-8 text-center">
        <div className="bg-cream mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2">
          <Target className="text-charcoal size-4" />
          <span className="text-charcoal text-xs font-semibold tracking-wide uppercase">
            Training Mode
          </span>
        </div>
        <h2 className="heading-serif text-charcoal mb-3 text-3xl">
          Choose Your Training Track
        </h2>
        <p className="text-warm-gray mx-auto max-w-lg text-sm leading-relaxed">
          Each track is designed to develop specific sales skills through
          structured scenarios. The AI will adapt its behavior and your feedback
          will be weighted based on the track objectives.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {TRAINING_TRACKS.map((track) => {
          const isAdaptive = track.id === "adaptive";
          const isLocked = isAdaptive && totalSessions < 3;

          return (
            <button
              key={track.id}
              onClick={() => !isLocked && setSelectedTrack(track)}
              disabled={isLocked}
              className={`group text-left ${isLocked ? "cursor-not-allowed opacity-80" : ""}`}
            >
              <Card
                className={`border-border/60 relative h-full overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 ${isLocked ? "" : "hover:border-charcoal/30 hover:shadow-lg"}`}
              >
                {isLocked && (
                  <div className="bg-charcoal/5 absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm">
                      <Lock className="text-charcoal/40 size-5" />
                    </div>
                    <span className="text-charcoal/60 text-[10px] font-bold tracking-wider uppercase">
                      Locked
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div
                    className={`bg-cream text-charcoal flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${isLocked ? "" : "group-hover:bg-charcoal group-hover:text-cream"}`}
                  >
                    {TRACK_ICONS[track.icon]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-charcoal mb-1 text-lg font-semibold">
                      {track.name}
                    </h3>
                    <p className="text-warm-gray mb-3 text-xs leading-relaxed">
                      {track.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {isLocked ? (
                        <span className="text-[10px] font-bold tracking-tight text-rose-600/70">
                          Complete 3 sessions to unlock
                        </span>
                      ) : (
                        <>
                          <span className="bg-cream/80 text-charcoal/60 border-border/20 rounded-full border px-2 py-1 text-[10px] font-semibold">
                            {isAdaptive
                              ? "AI Tailored"
                              : `${track.scenarios.length} scenarios`}
                          </span>
                          <ChevronRight className="text-warm-gray size-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="pt-4 text-center">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-warm-gray hover:text-charcoal gap-2 text-sm"
        >
          <Zap className="size-4" />
          Skip — Free Roleplay
        </Button>
        <p className="text-warm-gray-light mt-2 text-[11px]">
          Or jump straight into an unstructured roleplay session
        </p>
      </div>
    </div>
  );
}
