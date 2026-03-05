"use client";

import { cn } from "@/lib/utils";
import { Zap, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeatmapMarker {
  insight: string;
  timestamp: number;
}

interface ObjectionHeatmapProps {
  insights: HeatmapMarker[];
  durationSeconds: number;
  onSeek?: (seconds: number) => void;
  className?: string;
}

export function ObjectionHeatmap({
  insights,
  durationSeconds,
  onSeek,
  className,
}: ObjectionHeatmapProps) {
  const getMarkerColor = (insight: string) => {
    const lower = insight.toLowerCase();
    if (
      lower.includes("great") ||
      lower.includes("excellent") ||
      lower.includes("perfect") ||
      lower.includes("strong")
    )
      return "bg-emerald-500 border-emerald-600/20 shadow-emerald-500/20";
    if (
      lower.includes("missed") ||
      lower.includes("fumbled") ||
      lower.includes("avoided") ||
      lower.includes("weak")
    )
      return "bg-rose-500 border-rose-600/20 shadow-rose-500/20";
    if (lower.includes("concern") || lower.includes("objection"))
      return "bg-amber-500 border-amber-600/20 shadow-amber-500/20";
    return "bg-sky-500 border-sky-600/20 shadow-sky-500/20";
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-charcoal flex items-center gap-2 text-sm font-bold">
          <Zap className="size-4 text-amber-500" />
          Objection Heatmap & Deal Autopsy
        </h3>
        <span className="text-warm-gray text-[10px] font-bold tracking-widest uppercase">
          {insights.length} Moments Logged
        </span>
      </div>

      <div className="relative h-12 w-full pt-4">
        {/* The Timeline Track */}
        <div className="bg-cream border-border/40 relative h-3 w-full overflow-hidden rounded-full border shadow-inner">
          {/* Subtle gradient track */}
          <div className="h-full w-full bg-linear-to-r from-emerald-500/5 via-amber-500/5 to-rose-500/5" />
        </div>

        {/* Markers */}
        <TooltipProvider>
          {insights.map((marker, i) => {
            const position = (marker.timestamp / durationSeconds) * 100;
            const colorClass = getMarkerColor(marker.insight);

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSeek?.(marker.timestamp)}
                    className={cn(
                      "group absolute top-1.5 flex h-6 w-1.5 -translate-x-1/2 flex-col items-center gap-1 transition-all hover:scale-x-150 active:scale-95",
                    )}
                    style={{
                      left: `${Math.min(Math.max(position, 0.5), 99.5)}%`,
                    }}
                  >
                    <div
                      className={cn(
                        "size-full rounded-full border shadow-sm transition-colors",
                        colorClass,
                      )}
                    />
                    <div className="bg-charcoal/10 size-1 rounded-full opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-charcoal border-charcoal max-w-[240px] px-3 py-2 text-white shadow-xl"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                      <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase">
                        {formatTime(marker.timestamp)}
                      </span>
                      <Info className="size-3 text-white/30" />
                    </div>
                    <p className="text-xs leading-relaxed font-medium">
                      {marker.insight}
                    </p>
                    <p className="text-[10px] text-white/40 italic">
                      Click to replay audio from this moment
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>

        {/* Duration Labels */}
        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-warm-gray text-[10px] font-medium">0:00</span>
          <span className="text-warm-gray text-[10px] font-medium">
            {formatTime(durationSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}
