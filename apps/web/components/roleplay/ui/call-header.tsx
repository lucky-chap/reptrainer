"use client";

import { Clock, Zap } from "lucide-react";
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
    <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-2.5">
      {/* Left: participants */}
      <div className="flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          <div className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-[10px] font-bold text-neutral-600 shadow-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex size-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-100 text-[10px] font-bold text-neutral-600 shadow-sm">
            {persona.avatarUrl || avatarUrl ? (
              <Image
                src={
                  persona.avatarUrl ||
                  (avatarUrl as string) ||
                  "/placeholder-avatar.png"
                }
                alt={persona.name}
                className="object-cover"
                width={28}
                height={28}
              />
            ) : (
              persona.name.charAt(0)
            )}
          </div>
        </div>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-neutral-800">
            {persona.name}
          </p>
          <p className="text-[10px] text-neutral-400">
            {persona.role}
            {track ? ` · ${track.name}` : ""}
          </p>
        </div>
      </div>

      {/* Right: timers & status */}
      <div className="flex items-center gap-2">
        {isConnected && (
          <>
            {/* Live dot + elapsed */}
            <div className="flex items-center gap-1.5 rounded-full bg-neutral-50 px-2.5 py-1">
              <div
                className={`size-1.5 rounded-full ${personaLeft ? "bg-rose-500" : "animate-pulse bg-emerald-500"}`}
              />
              <span className="font-mono text-[11px] font-medium text-neutral-600">
                {formatTime(elapsed)}
              </span>
            </div>

            {/* Countdown */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                warningTriggered
                  ? "animate-pulse border border-amber-200 bg-amber-50"
                  : "bg-neutral-50"
              }`}
            >
              <Clock
                className={`size-3 ${warningTriggered ? "text-amber-500" : "text-neutral-400"}`}
              />
              <span
                className={`font-mono text-[11px] font-bold ${
                  warningTriggered ? "text-amber-600" : "text-neutral-600"
                }`}
              >
                {formattedRemaining}
              </span>
            </div>

            {/* Debrief status */}
            {elapsed < 180 && !personaLeft && (
              <div className="flex items-center gap-1.5 rounded-full bg-neutral-50 px-2.5 py-1">
                <Zap className="size-3 text-neutral-400" />
                <span className="text-[10px] font-medium text-neutral-400">
                  Debrief in {formatTime(180 - elapsed)}
                </span>
              </div>
            )}
            {elapsed >= 180 && !personaLeft && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1">
                <Zap className="size-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600">
                  Debrief Ready
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
