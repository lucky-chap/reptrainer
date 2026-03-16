"use client";

import Image from "next/image";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CallDurationSelector } from "@/components/call-duration-selector";
import type { Persona, KnowledgeMetadata } from "@/lib/db";
import type { ScenarioTemplate } from "@reptrainer/shared";

interface DurationSelectorStageProps {
  onBack: () => void;
  persona: Persona;
  avatarUrl: string | null;
  knowledgeMetadata?: KnowledgeMetadata;
  callDurationMinutes: number;
  onSelectDuration: (mins: number) => void;
  track?: { name: string } | null;
  scenario?: ScenarioTemplate | null;
}

export function DurationSelectorStage({
  onBack,
  persona,
  avatarUrl,
  knowledgeMetadata,
  callDurationMinutes,
  onSelectDuration,
  track,
  scenario,
}: DurationSelectorStageProps) {
  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <Card className="border-border/60 mx-auto max-w-lg rounded-3xl border bg-white p-10 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="bg-cream mb-6 flex size-20 items-center justify-center rounded-2xl">
            <Clock className="text-charcoal size-10" />
          </div>
          <h2 className="heading-serif text-charcoal mb-3 text-3xl">
            Set Call Duration
          </h2>
          <p className="text-warm-gray max-w-sm text-sm leading-relaxed">
            How long should this sales call last? The timer will count down and
            the call will automatically end when time runs out.
          </p>
        </div>

        <CallDurationSelector
          defaultDuration={callDurationMinutes}
          onSelect={onSelectDuration}
        />
      </Card>

      {/* Track info */}
      {track && scenario && (
        <Card className="border-border/40 mx-auto max-w-lg rounded-2xl border bg-white/60 p-5">
          <div className="flex items-center gap-3">
            <BookOpen className="text-charcoal size-5" />
            <div className="min-w-0 flex-1">
              <h3 className="text-charcoal truncate text-sm font-semibold">
                {track.name}: {scenario.name}
              </h3>
              <p className="text-warm-gray truncate text-xs">
                Difficulty {scenario.difficulty}/3 · Focus:{" "}
                {Object.entries(scenario.evaluationWeighting || {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 2)
                  .map(([k]) => k.replace(/_/g, " "))
                  .join(", ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Persona preview */}
      <Card className="border-border/40 mx-auto max-w-lg rounded-2xl border bg-white/60 p-5">
        <div className="flex items-center gap-4">
          <Image
            src={
              persona.avatarUrl ||
              (avatarUrl as string) ||
              "/placeholder-avatar.png"
            }
            alt={persona.name}
            width={48}
            height={48}
            className="bg-cream shrink-0 rounded-full object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-charcoal truncate text-sm font-semibold">
              {persona.name}
            </h3>
            <p className="text-warm-gray truncate text-xs">{persona.role}</p>
          </div>
          <div className="text-warm-gray-light bg-cream/50 border-border/20 rounded-full border px-3 py-1 text-[11px] font-medium">
            {knowledgeMetadata?.productCategory
              ? `Evaluating ${knowledgeMetadata.productCategory}`
              : "General AI Coaching"}
          </div>
        </div>
      </Card>
    </div>
  );
}
