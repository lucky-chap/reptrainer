"use client";

import Image from "next/image";
import { Loader2, Zap, UserX, Search } from "lucide-react";
import type { Persona } from "@/lib/db";
import { AudioVisualizer } from "./audio-visualizer";

interface PersonaCallCardProps {
  persona: Persona;
  avatarUrl: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  personaLeft: boolean;
  isAISpeaking: boolean;
  callDurationMinutes: number;
  displayName: string;
  showHUD: boolean;
  latestInsight?: { insight: string; timestamp: number } | null;
  isPersonaResearching?: boolean;
  researchTopic?: string;
}

export function PersonaCallCard({
  persona,
  avatarUrl,
  isConnected,
  isConnecting,
  personaLeft,
  isAISpeaking,
  callDurationMinutes,
  displayName,
  showHUD,
  latestInsight,
  isPersonaResearching,
  researchTopic,
}: PersonaCallCardProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-neutral-50 to-white">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Connecting state */}
      {isConnecting ? (
        <div className="z-10 flex flex-col items-center justify-center text-center">
          <div className="relative mb-5 flex size-28 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-neutral-100 sm:size-36">
            <Loader2 className="size-8 animate-spin text-neutral-400" />
            <div className="absolute inset-0 animate-ping rounded-full ring-2 ring-neutral-200/50" />
          </div>
          <p className="text-sm font-semibold text-neutral-700">
            Connecting...
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Setting up your call with {persona.name}
          </p>
        </div>
      ) : personaLeft ? (
        /* Persona left */
        <div className="z-10 flex flex-col items-center justify-center text-center">
          <div className="mb-5 flex size-28 items-center justify-center rounded-full bg-neutral-50 ring-1 ring-neutral-200">
            <UserX className="size-8 text-neutral-300" />
          </div>
          <p className="text-sm font-semibold text-neutral-700">
            {persona.name} left
          </p>
          <p className="mt-1 max-w-[240px] text-xs text-neutral-400">
            The buyer has ended the meeting. End the call to see your review.
          </p>
        </div>
      ) : isConnected ? (
        /* Live call */
        <div className="z-10 flex flex-col items-center justify-center">
          {/* Avatar */}
          <div className="relative">
            <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-white text-4xl font-bold text-neutral-300 shadow-lg ring-1 ring-neutral-100 sm:size-36">
              {persona.avatarUrl || avatarUrl ? (
                <Image
                  src={
                    persona.avatarUrl ||
                    (avatarUrl as string) ||
                    "/placeholder-avatar.png"
                  }
                  alt={persona.name}
                  className="h-full w-full object-cover"
                  width={144}
                  height={144}
                />
              ) : (
                persona.name.charAt(0)
              )}
            </div>
            {/* Speaking ring animation */}
            {isAISpeaking && (
              <>
                <div className="absolute inset-0 animate-pulse rounded-full ring-[3px] ring-emerald-400/40" />
                <div className="absolute inset-[-6px] animate-ping rounded-full ring-1 ring-emerald-300/20 [animation-duration:2s]" />
              </>
            )}
          </div>

          {/* Name label */}
          <p className="mt-3 text-xs font-semibold text-neutral-700">
            {persona.name}
          </p>

          {/* Status pill */}
          <div className="mt-2 h-5">
            {isPersonaResearching ? (
              <div className="animate-fade-in flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/80 px-2.5 py-0.5 text-[10px] font-medium text-sky-600 shadow-sm backdrop-blur-sm">
                <Search className="size-2.5 animate-pulse" />
                <span>
                  Researching{researchTopic ? ` ${researchTopic}` : ""}...
                </span>
              </div>
            ) : isAISpeaking ? (
              <div className="animate-fade-in flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600">
                <div className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Speaking...
              </div>
            ) : (
              <p className="text-[10px] font-medium text-neutral-400">
                Listening...
              </p>
            )}
          </div>

          <AudioVisualizer isSpeaking={isAISpeaking} />

          {/* Whisper Coach HUD */}
          <div
            className={`absolute bottom-20 left-1/2 z-20 w-full max-w-xs -translate-x-1/2 px-4 transition-all duration-500 ease-out ${
              showHUD
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-4 opacity-0"
            }`}
          >
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/50 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-100">
                <Zap className="size-3 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-bold tracking-widest text-amber-500 uppercase">
                  Whisper Coach
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed font-medium text-neutral-700">
                  {latestInsight?.insight || "Analyzing conversation..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pre-call idle */
        <div className="z-10 flex flex-col items-center justify-center text-center">
          <div className="mb-5 flex size-24 items-center justify-center overflow-hidden rounded-full bg-white text-4xl font-bold text-neutral-300 shadow-md ring-1 ring-neutral-100">
            {persona.avatarUrl || avatarUrl ? (
              <Image
                src={
                  persona.avatarUrl ||
                  (avatarUrl as string) ||
                  "/placeholder-avatar.png"
                }
                alt={persona.name}
                width={96}
                height={96}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              persona.name.charAt(0)
            )}
          </div>
          <p className="text-sm font-semibold text-neutral-700">
            Ready to start
          </p>
          <p className="mt-1 max-w-[260px] text-xs text-neutral-400">
            Start the call to begin your {callDurationMinutes}-minute roleplay
            with {persona.name}.
          </p>
        </div>
      )}

      {/* "You" badge — top-left */}
      {isConnected && !personaLeft && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <div className="flex size-6 items-center justify-center rounded-full bg-neutral-800 text-[9px] font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] font-medium text-neutral-500">
            {displayName}
          </span>
        </div>
      )}
    </div>
  );
}
