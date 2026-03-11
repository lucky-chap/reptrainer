"use client";

import { BookOpen } from "lucide-react";
import { VibeMeter } from "@/components/vibe-meter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Persona, KnowledgeMetadata } from "@/lib/db";
import type { ScenarioTemplate } from "@reptrainer/shared";

interface CallSidebarProps {
  persona: Persona;
  knowledgeMetadata?: KnowledgeMetadata;
  track?: { name: string } | null;
  scenario?: ScenarioTemplate | null;
  isConnected: boolean;
  personaLeft: boolean;
  moods: any[];
  warningTriggered: boolean;
  formattedRemaining: string;
  callDurationMinutes: number;
  children?: React.ReactNode;
}

export function CallSidebar({
  persona,
  knowledgeMetadata,
  track,
  scenario,
  isConnected,
  personaLeft,
  moods,
  warningTriggered,
  formattedRemaining,
  callDurationMinutes,
  children,
}: CallSidebarProps) {
  return (
    <div className="hidden w-[380px] shrink-0 flex-col gap-3 lg:flex xl:w-[420px]">
      {/* Meeting Overview Card */}
      <div className="shrink-0 rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-charcoal mb-2 text-lg font-semibold">
          Meeting overview
        </h3>
        <p className="text-warm-gray mb-4 text-xs leading-relaxed">
          You&apos;re in a live sales roleplay with{" "}
          <strong className="text-charcoal">{persona.name}</strong> (
          {persona.role}). This session is designed to test your pitch,
          objection handling, and closing skills.
          {knowledgeMetadata?.productCategory && (
            <>
              {" "}
              You&apos;re pitching{" "}
              <strong className="text-charcoal">
                {knowledgeMetadata.productCategory}
              </strong>
              .
            </>
          )}
        </p>
        <div className="flex gap-2">
          <div className="bg-cream flex-1 rounded-xl px-3 py-2 text-center">
            <p className="text-warm-gray mb-0.5 text-[10px] tracking-wider uppercase">
              Intensity
            </p>
            <p className="text-charcoal text-sm font-semibold">
              {persona.intensityLevel}/5
            </p>
          </div>
          <div className="bg-cream flex-1 rounded-xl px-3 py-2 text-center">
            <p className="text-warm-gray mb-0.5 text-[10px] tracking-wider uppercase">
              Time Left
            </p>
            <p
              className={`font-mono text-sm font-semibold ${warningTriggered ? "text-amber-600" : "text-charcoal"}`}
            >
              {isConnected ? formattedRemaining : `${callDurationMinutes}:00`}
            </p>
          </div>
        </div>

        {/* Track badge */}
        {track && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
            <BookOpen className="size-3.5 text-sky-600" />
            <span className="text-[11px] font-medium text-sky-700">
              {track.name}
              {scenario ? `: ${scenario.name}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Tabs for Vibe Meter and Transcript */}
      <Tabs defaultValue="transcript" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full shrink-0 grid-cols-2 bg-white/50 p-1">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="vibe">Persona Vibe</TabsTrigger>
        </TabsList>

        <TabsContent
          value="transcript"
          className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          {children}
        </TabsContent>

        <TabsContent
          value="vibe"
          className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          {isConnected && !personaLeft ? (
            <VibeMeter mood={moods[moods.length - 1]} />
          ) : (
            <div className="border-border/40 text-warm-gray flex h-full items-center justify-center rounded-2xl border border-dashed bg-white/50 p-6 text-center text-sm">
              Start the call to see the persona vibe.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
