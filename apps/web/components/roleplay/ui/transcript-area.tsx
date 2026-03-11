"use client";

import { MessageSquare, PhoneOff } from "lucide-react";
import type { Persona } from "@/lib/db";

interface TranscriptEntry {
  role: "user" | "model";
  text: string;
  isStreaming?: boolean;
  isInterrupted?: boolean;
}

interface TranscriptAreaProps {
  transcript: TranscriptEntry[];
  isConnected: boolean;
  persona: Persona;
  displayName: string;
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
}

export function TranscriptArea({
  transcript,
  isConnected,
  persona,
  displayName,
  transcriptEndRef,
}: TranscriptAreaProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border/40 bg-cream/20 flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <MessageSquare className="text-warm-gray size-4" />
        <h3 className="text-charcoal text-sm font-semibold">Live Transcript</h3>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {transcript.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="bg-cream mb-3 flex size-10 items-center justify-center rounded-full">
                <MessageSquare className="text-warm-gray size-4" />
              </div>
              <p className="text-warm-gray max-w-[180px] text-xs">
                {isConnected
                  ? "Listening... conversation will appear here."
                  : "Start the call to see the live transcript."}
              </p>
            </div>
          ) : (
            transcript.map((entry, i) => (
              <div
                key={i}
                className={`animate-fade-up flex gap-2.5 ${
                  entry.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
                style={{
                  animationDelay: `${Math.min(i * 50, 200)}ms`,
                }}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    entry.role === "model"
                      ? "bg-charcoal text-cream"
                      : "bg-cream-dark text-charcoal"
                  }`}
                >
                  {entry.role === "model"
                    ? persona.name.charAt(0)
                    : displayName.charAt(0).toUpperCase()}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                    entry.role === "user"
                      ? "bg-charcoal rounded-tr-sm text-white"
                      : "bg-cream/80 text-charcoal rounded-tl-sm"
                  }`}
                >
                  <p
                    className={`mb-0.5 text-[9px] font-bold tracking-wider uppercase ${entry.role === "user" ? "text-white/50" : "text-warm-gray"}`}
                  >
                    {entry.role === "user" ? displayName : persona.name}
                  </p>
                  <p className="leading-relaxed">
                    {entry.text}
                    {entry.isStreaming && (
                      <span className="ml-1 inline-block h-3.5 w-1 animate-pulse rounded-full bg-current align-middle opacity-50" />
                    )}
                    {entry.role === "model" && entry.isInterrupted && (
                      <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 opacity-80">
                        <PhoneOff className="size-2.5" /> [Interrupted]
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div ref={transcriptEndRef} className="h-2" />
      </div>
    </div>
  );
}
