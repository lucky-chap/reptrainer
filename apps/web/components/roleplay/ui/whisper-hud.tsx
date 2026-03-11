"use client";

import { Zap, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WhisperHUDProps {
  show: boolean;
  insight: string;
}

export function WhisperHUD({ show, insight }: WhisperHUDProps) {
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed top-24 right-8 z-50 w-72">
      <Card className="animate-in slide-in-from-right fade-in bg-charcoal/90 border-charcoal/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all duration-500">
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-400" />
              <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase">
                Live Tips
              </span>
            </div>
            <div className="size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-sm bg-white/10 p-1">
              <Lightbulb className="size-3.5 text-amber-200" />
            </div>
            <p className="text-sm leading-relaxed font-medium text-white/90">
              {insight}
            </p>
          </div>
          <div className="mt-4 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="animate-progress-shrink h-full bg-amber-400/80" />
          </div>
        </div>
      </Card>
    </div>
  );
}
