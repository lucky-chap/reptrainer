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
    <div className="flex shrink-0 items-center justify-center gap-3 py-2">
      {/* Mic toggle */}
      <button
        onClick={onToggleMic}
        className={`border-border/40 flex size-11 items-center justify-center rounded-full border shadow-sm transition-colors ${
          isMuted
            ? "border-rose-200 bg-rose-50 text-rose-600"
            : "text-charcoal hover:bg-cream bg-white"
        }`}
        disabled={inputLocked || !isConnected}
      >
        {isConnected && !isMuted ? (
          <Mic className="size-5" />
        ) : (
          <MicOff className="size-5" />
        )}
      </button>

      {/* Log Insight Button */}
      {isConnected && !personaLeft && !inputLocked && (
        <button
          onClick={onLogInsight}
          title="Log Sales Insight"
          className="border-border/40 hover:bg-cream flex size-11 items-center justify-center rounded-full border bg-white text-amber-500 shadow-sm transition-colors"
        >
          <Lightbulb className="size-5" />
        </button>
      )}

      {/* Start / End Call */}
      {!isConnected && (isConnecting || isReconnecting) ? (
        <button
          disabled
          className="bg-charcoal/80 text-cream inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-all duration-200"
        >
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Connecting...</span>
        </button>
      ) : !isConnected && !personaLeft ? (
        <button
          onClick={onConnect}
          disabled={inputLocked}
          className="bg-charcoal text-cream hover:bg-charcoal-light group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
        >
          <Phone className="size-4" />
          <span className="text-sm">Start Call</span>
        </button>
      ) : (
        <button
          onClick={onEndCall}
          className="flex size-11 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition-colors hover:bg-rose-600"
        >
          <PhoneOff className="size-5" />
        </button>
      )}
    </div>
  );
}
