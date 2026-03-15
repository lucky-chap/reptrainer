"use client";

import { Mic, MicOff, Phone, PhoneOff, Lightbulb, Loader2 } from "lucide-react";

interface CallControlsProps {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting?: boolean;
  isMuted: boolean;
  personaLeft: boolean;
  inputLocked: boolean;
  onToggleMic: () => void;
  onLogInsight: () => void;
  onConnect: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isConnected,
  isConnecting,
  isReconnecting = false,
  isMuted,
  personaLeft,
  inputLocked,
  onToggleMic,
  onLogInsight,
  onConnect,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2.5 border-t border-neutral-100 bg-white py-3">
      {/* Mic toggle */}
      <button
        onClick={onToggleMic}
        className={`flex size-10 items-center justify-center rounded-full transition-all ${
          isMuted
            ? "bg-rose-50 text-rose-500 ring-1 ring-rose-200"
            : "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100"
        }`}
        disabled={inputLocked || !isConnected}
      >
        {isConnected && !isMuted ? (
          <Mic className="size-4" />
        ) : (
          <MicOff className="size-4" />
        )}
      </button>

      {/* Log Insight */}
      {isConnected && !personaLeft && !inputLocked && (
        <button
          onClick={onLogInsight}
          title="Log Sales Insight"
          className="flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-500 ring-1 ring-amber-200 transition-all hover:bg-amber-100"
        >
          <Lightbulb className="size-4" />
        </button>
      )}

      {/* Start / End Call */}
      {!isConnected && (isConnecting || isReconnecting) ? (
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-6 py-2.5 text-sm font-medium text-white opacity-70"
        >
          <Loader2 className="size-3.5 animate-spin" />
          Connecting...
        </button>
      ) : !isConnected && !personaLeft ? (
        <button
          onClick={onConnect}
          disabled={inputLocked}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-neutral-700 disabled:opacity-50"
        >
          <Phone className="size-3.5" />
          Start Call
        </button>
      ) : (
        <button
          onClick={onEndCall}
          className="flex size-10 items-center justify-center rounded-full bg-rose-500 text-white shadow-md shadow-rose-500/20 transition-all hover:bg-rose-600"
        >
          <PhoneOff className="size-4" />
        </button>
      )}
    </div>
  );
}
