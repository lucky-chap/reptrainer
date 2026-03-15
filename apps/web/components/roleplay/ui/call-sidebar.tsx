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
    <div className="hidden w-[360px] shrink-0 flex-col border-l border-neutral-100 lg:flex xl:w-[400px]">
      {/* Meeting context — compact */}
      <div className="shrink-0 border-b border-neutral-100 px-5 py-4">
        <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
          Meeting Overview
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
          Live roleplay with{" "}
          <span className="font-semibold text-neutral-700">{persona.name}</span>{" "}
          ({persona.role}).
          {knowledgeMetadata?.productCategory && (
            <>
              {" "}
              Pitching{" "}
              <span className="font-semibold text-neutral-700">
                {knowledgeMetadata.productCategory}
              </span>
              .
            </>
          )}
        </p>

        <div className="mt-3 flex gap-2">
          <div className="flex-1 rounded-lg bg-neutral-50 px-3 py-1.5 text-center">
            <p className="text-[9px] font-medium tracking-wider text-neutral-400 uppercase">
              Intensity
            </p>
            <p className="text-sm font-bold text-neutral-700">
              {persona.intensityLevel}/5
            </p>
          </div>
          <div className="flex-1 rounded-lg bg-neutral-50 px-3 py-1.5 text-center">
            <p className="text-[9px] font-medium tracking-wider text-neutral-400 uppercase">
              Remaining
            </p>
            <p
              className={`font-mono text-sm font-bold ${warningTriggered ? "text-amber-600" : "text-neutral-700"}`}
            >
              {isConnected ? formattedRemaining : `${callDurationMinutes}:00`}
            </p>
          </div>
        </div>

        {track && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50/50 px-2.5 py-1.5">
            <BookOpen className="size-3 text-sky-500" />
            <span className="text-[10px] font-medium text-sky-700">
              {track.name}
              {scenario ? `: ${scenario.name}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transcript" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 grid shrink-0 grid-cols-2 bg-neutral-50 p-0.5">
          <TabsTrigger
            value="transcript"
            className="text-[11px] data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Transcript
          </TabsTrigger>
          <TabsTrigger
            value="vibe"
            className="text-[11px] data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Persona Vibe
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="transcript"
          className="mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          {children}
        </TabsContent>

        <TabsContent
          value="vibe"
          className="mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          {isConnected && !personaLeft ? (
            <VibeMeter mood={moods[moods.length - 1]} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-xs text-neutral-400">
              Start the call to see the persona vibe.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
