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
  isModelThinking?: boolean;
  streamingModelText?: string;
}

export function TranscriptArea({
  transcript,
  isConnected,
  persona,
  displayName,
  transcriptEndRef,
  isModelThinking,
  streamingModelText,
}: TranscriptAreaProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          {transcript.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-neutral-100">
                <MessageSquare className="size-3.5 text-neutral-400" />
              </div>
              <p className="max-w-[180px] text-[11px] text-neutral-400">
                {isConnected
                  ? "Listening... conversation will appear here."
                  : "Start the call to see the live transcript."}
              </p>
            </div>
          ) : (
            transcript.map((entry, i) => (
              <div
                key={i}
                className={`animate-fade-up flex gap-2 ${
                  entry.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
                style={{
                  animationDelay: `${Math.min(i * 50, 200)}ms`,
                }}
              >
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    entry.role === "model"
                      ? "bg-neutral-800 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {entry.role === "model"
                    ? persona.name.charAt(0)
                    : displayName.charAt(0).toUpperCase()}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                    entry.role === "user"
                      ? "rounded-tr-sm bg-neutral-800 text-white"
                      : "rounded-tl-sm bg-neutral-100 text-neutral-700"
                  }`}
                >
                  <p
                    className={`mb-0.5 text-[8px] font-bold tracking-wider uppercase ${entry.role === "user" ? "text-white/40" : "text-neutral-400"}`}
                  >
                    {entry.role === "user" ? displayName : persona.name}
                  </p>
                  <p>
                    {entry.text}
                    {entry.isStreaming && (
                      <span className="ml-1 inline-block h-3 w-0.5 animate-pulse rounded-full bg-current align-middle opacity-50" />
                    )}
                    {entry.role === "model" && entry.isInterrupted && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-500 opacity-80">
                        <PhoneOff className="size-2" /> cut off
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}

          {isModelThinking && (
            <div className="animate-fade-up flex flex-row gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[9px] font-bold text-white">
                {persona.name.charAt(0)}
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-neutral-100 px-3 py-2 text-[12px] text-neutral-700">
                <p className="mb-0.5 text-[8px] font-bold tracking-wider text-neutral-400 uppercase">
                  {persona.name}
                </p>
                <div className="flex flex-col gap-1">
                  <p className="leading-relaxed whitespace-pre-wrap italic opacity-60">
                    {streamingModelText}
                  </p>
                  <div className="flex gap-1 py-0.5">
                    <span className="size-1 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
                    <span className="size-1 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
                    <span className="size-1 animate-bounce rounded-full bg-neutral-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={transcriptEndRef} className="h-2" />
      </div>
    </div>
  );
}
