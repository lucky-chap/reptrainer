"use client";

import { Phone, Clock, Zap } from "lucide-react";
import Image from "next/image";
import type { Persona } from "@/lib/db";

interface CallHeaderProps {
  persona: Persona;
  avatarUrl: string | null;
  track?: { name: string } | null;
  isConnected: boolean;
  warningTriggered: boolean;
  formattedRemaining: string;
  elapsed: number;
  formatTime: (s: number) => string;
  personaLeft: boolean;
  displayName: string;
}

export function CallHeader({
  persona,
  avatarUrl,
  track,
  isConnected,
  warningTriggered,
  formattedRemaining,
  elapsed,
  formatTime,
  personaLeft,
  displayName,
}: CallHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="bg-amber-glow flex size-8 items-center justify-center rounded-lg">
          <Phone className="size-4 text-black" />
        </div>
        <div>
          <h3 className="text-charcoal text-sm leading-tight font-semibold">
            Sales Roleplay Session
          </h3>
          <p className="text-warm-gray text-[11px]">
            {persona.name} · {persona.role}
            {track ? ` · ${track.name}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isConnected && (
          <>
            {/* Countdown timer */}
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                warningTriggered
                  ? "animate-pulse border-amber-300 bg-amber-50"
                  : "bg-cream border-border/40"
              }`}
            >
              <Clock
                className={`size-3.5 ${warningTriggered ? "text-amber-600" : "text-warm-gray"}`}
              />
              <span
                className={`font-mono text-xs font-bold ${
                  warningTriggered ? "text-amber-700" : "text-charcoal"
                }`}
              >
                {formattedRemaining}
              </span>
            </div>

            {/* Live indicator + elapsed time */}
            <div className="bg-cream border-border/40 flex items-center gap-2 rounded-full border px-3 py-1.5">
              <div
                className={`size-2 rounded-full ${personaLeft ? "bg-rose-500" : "animate-pulse bg-emerald-500"}`}
              />
              <span className="text-charcoal font-mono text-xs font-medium">
                {formatTime(elapsed)}
              </span>
            </div>

            {/* Coach Debrief Countdown */}
            {elapsed < 180 && !personaLeft && (
              <div className="bg-charcoal/5 border-charcoal/10 flex items-center gap-2 rounded-full border px-3 py-1.5">
                <Zap className="size-3 text-amber-600" />
                <span className="text-charcoal/60 text-[10px] font-bold tracking-tight uppercase">
                  Debrief Unlocks in {formatTime(180 - elapsed)}
                </span>
              </div>
            )}
            {elapsed >= 180 && !personaLeft && (
              <div className="animate-in fade-in zoom-in-95 flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 duration-500">
                <Zap className="size-3 fill-emerald-600 text-emerald-600" />
                <span className="text-[10px] font-bold tracking-tight text-emerald-600 uppercase">
                  Debrief Unlocked
                </span>
              </div>
            )}
          </>
        )}
        <div className="flex items-center -space-x-2">
          <div className="bg-cream text-charcoal flex size-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="bg-cream text-charcoal flex size-8 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[10px] font-bold shadow-sm">
            {persona.avatarUrl || avatarUrl ? (
              <Image
                src={
                  persona.avatarUrl ||
                  (avatarUrl as string) ||
                  "/placeholder-avatar.png"
                }
                alt={persona.name}
                className="object-cover"
                width={32}
                height={32}
              />
            ) : (
              persona.name.charAt(0)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
