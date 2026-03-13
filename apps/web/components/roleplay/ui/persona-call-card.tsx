"use client";

import Image from "next/image";
import { Loader2, Zap, UserX, Mic, MicOff } from "lucide-react";
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
}: PersonaCallCardProps) {
  return (
    <div className="bg-cream/40 border-border/40 relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border">
      {/* "You" label top-left */}
      {isConnected && !personaLeft && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="text-charcoal border-border/40 flex size-8 items-center justify-center rounded-full border bg-white text-xs font-bold shadow-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-charcoal text-xs font-medium">
            {displayName}
          </span>
        </div>
      )}

      {/* Connecting state (Highest Priority) */}
      {isConnecting ? (
        <div className="z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className="border-border/60 relative mb-4 flex size-24 items-center justify-center rounded-full border bg-white shadow-sm sm:size-32">
            <Loader2 className="text-charcoal size-10 animate-spin" />
            <div className="border-charcoal/10 animate-pulse-ring absolute inset-0 rounded-full border-2" />
          </div>
          <h3 className="text-charcoal mb-1 text-lg font-semibold">
            Connecting...
          </h3>
          <p className="text-warm-gray text-sm">
            Setting up your call with {persona.name}
          </p>
        </div>
      ) : personaLeft ? (
        /* Persona left state */
        <div className="z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className="border-border/60 mb-4 flex size-24 items-center justify-center rounded-full border bg-white shadow-sm">
            <UserX className="text-charcoal/40 size-10" />
          </div>
          <h3 className="text-charcoal mb-1 text-lg font-semibold">
            {persona.name} left
          </h3>
          <p className="text-warm-gray max-w-[260px] text-sm">
            The buyer has ended the meeting. End the call to see your review.
          </p>
        </div>
      ) : isConnected ? (
        /* Live call: persona avatar with visualizer */
        <div className="z-10 flex flex-col items-center justify-center">
          <div className="border-border/60 text-charcoal relative flex size-32 items-center justify-center overflow-hidden rounded-full border bg-white text-5xl font-bold shadow-md sm:size-40">
            <div className="from-cream flex size-full items-center justify-center bg-linear-to-br to-white">
              {persona.avatarUrl || avatarUrl ? (
                <Image
                  src={
                    persona.avatarUrl ||
                    (avatarUrl as string) ||
                    "/placeholder-avatar.png"
                  }
                  alt={persona.name}
                  className="h-full w-full object-cover"
                  width={86}
                  height={86}
                />
              ) : (
                persona.name.charAt(0)
              )}
            </div>
            {isAISpeaking && (
              <div className="border-charcoal/20 absolute inset-0 animate-pulse rounded-full border-[6px]" />
            )}
            {isAISpeaking && (
              <div className="border-charcoal/10 animate-pulse-ring absolute inset-[-10%] rounded-full border-2" />
            )}
          </div>

          {/* Whisper Coach HUD Overlay */}
          <div
            className={`absolute bottom-24 left-1/2 z-20 w-full max-w-sm -translate-x-1/2 px-4 transition-all duration-500 ease-out ${
              showHUD
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-4 opacity-0"
            }`}
          >
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/40 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <Zap className="size-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold tracking-widest text-amber-600 uppercase">
                  Whisper Coach
                </p>
                <p className="text-charcoal mt-0.5 text-xs leading-relaxed font-medium">
                  {latestInsight?.insight || "Analyzing conversation..."}
                </p>
              </div>
            </div>
          </div>

          {/* Speaking Indicator */}
          <div className="mt-4 h-6">
            {isAISpeaking ? (
              <div className="animate-fade-in flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-medium text-emerald-600">
                <div className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Buyer is speaking...
              </div>
            ) : (
              <div className="text-warm-gray text-[10px] font-medium">
                Listening...
              </div>
            )}
          </div>

          <AudioVisualizer isSpeaking={isAISpeaking} />
        </div>
      ) : (
        /* Pre-call idle state */
        <div className="z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className="border-border/60 text-charcoal mb-4 flex items-center justify-center overflow-hidden rounded-full border bg-white text-5xl font-bold shadow-sm">
            {persona.avatarUrl || avatarUrl ? (
              <Image
                src={
                  persona.avatarUrl ||
                  (avatarUrl as string) ||
                  "/placeholder-avatar.png"
                }
                alt={persona.name}
                width={86}
                height={86}
                className="h-[86px] w-[86px] rounded-full object-cover p-1"
              />
            ) : (
              persona.name.charAt(0)
            )}
          </div>
          <h3 className="text-charcoal mb-1 text-lg font-semibold">
            Ready to start
          </h3>
          <p className="text-warm-gray max-w-[280px] text-sm">
            Start the call to begin your {callDurationMinutes}-minute sales
            roleplay with {persona.name}.
          </p>
        </div>
      )}

      {/* Participant name badge bottom-left */}
      <div className="border-border/40 absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
        <span className="text-charcoal text-sm font-medium">
          {persona.name}
        </span>
        {personaLeft ? (
          <MicOff className="size-3.5 text-rose-600" />
        ) : (
          <Mic className="text-charcoal/60 size-3.5" />
        )}
      </div>
    </div>
  );
}
