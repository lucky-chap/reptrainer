import { useState } from "react";
import { cn } from "@/lib/utils";
import { Zap, Info, PlayCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [open, setOpen] = useState(false);

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

  const normalizeSeconds = (value: number) => {
    // Backward compatibility: older data stored ms, newer data stored seconds.
    if (durationSeconds > 0 && value > durationSeconds * 2) {
      return Math.round(value / 1000);
    }
    return value;
  };

  const formatTime = (s: number) => {
    const seconds = normalizeSeconds(s);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-full gap-2 border-amber-500/20 bg-amber-500/10 px-3 text-xs text-amber-700 hover:bg-amber-500/20 sm:w-auto",
            className,
          )}
        >
          <Zap className="size-3.5 fill-amber-500 text-amber-500" />
          View Sales Insights ({insights.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-none bg-white p-6 shadow-2xl sm:max-w-[600px]">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-charcoal flex items-center gap-2 text-xl font-bold">
            <Zap className="size-5 fill-amber-500 text-amber-500" />
            Deal Autopsy
          </DialogTitle>
          <p className="text-warm-gray mt-1 text-sm">
            Sales insights automatically generated during your call.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative w-full pt-4 pb-2">
            {/* The Timeline Track */}
            <div className="bg-cream/80 relative h-4 w-full overflow-hidden rounded-full border border-black/5 shadow-inner">
              {/* Subtle gradient track */}
              <div className="h-full w-full bg-linear-to-r from-emerald-500/10 via-amber-500/10 to-rose-500/10" />
              <div className="absolute inset-0 bg-linear-to-b from-black/2 to-transparent" />
            </div>

            {/* Duration Labels */}
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-charcoal/40 text-[10px] font-bold tracking-wider">
                0:00
              </span>
              <span className="text-charcoal/40 text-[10px] font-bold tracking-wider">
                {formatTime(durationSeconds)}
              </span>
            </div>

            {/* Markers */}
            <TooltipProvider delayDuration={100}>
              {insights.map((marker, i) => {
                const markerSeconds = normalizeSeconds(marker.timestamp);
                const position = (markerSeconds / durationSeconds) * 100;
                const colorClass = getMarkerColor(marker.insight);

                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setOpen(false); // Close dialog
                          onSeek?.(markerSeconds); // Jump to time
                        }}
                        className={cn(
                          "group absolute top-1.5 flex h-9 w-4 -translate-x-1/2 flex-col items-center justify-center transition-all hover:z-20 focus:outline-hidden",
                        )}
                        style={{
                          left: `${Math.min(Math.max(position, 1), 99)}%`,
                        }}
                      >
                        <div
                          className={cn(
                            "h-full w-1.5 rounded-full border shadow-sm transition-all duration-300 group-hover:w-2 group-hover:scale-110",
                            colorClass,
                          )}
                        />
                        {/* Hover Glow */}
                        <div
                          className={cn(
                            "absolute -inset-2 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40",
                            colorClass.split(" ")[0], // extract bg color for glow
                          )}
                        />
                        {/* Timestamp Label */}
                        <span className="text-charcoal/40 group-hover:text-charcoal/70 absolute top-full mt-1.5 text-[9px] font-bold tracking-wider whitespace-nowrap transition-colors duration-300">
                          {formatTime(marker.timestamp)}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={12}
                      className="bg-charcoal border-charcoal/10 max-w-[260px] rounded-xl px-4 py-3 text-white shadow-2xl"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "size-2 rounded-full",
                                colorClass.split(" ")[0],
                              )}
                            />
                            <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                              {formatTime(marker.timestamp)}
                            </span>
                          </div>
                          <Info className="size-3 text-white/40" />
                        </div>
                        <p className="text-xs leading-relaxed font-medium text-white/90">
                          {marker.insight}
                        </p>
                        <p className="flex items-center gap-1 pt-1 text-[10px] text-white/40 italic">
                          <PlayCircle className="size-3" /> Click to seek to
                          this moment
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>

          <div className="mt-4 grid max-h-[300px] gap-3 overflow-y-auto pr-2 pb-2">
            {insights.map((marker, i) => {
              const colorClass = getMarkerColor(marker.insight);
              return (
                <div
                  key={i}
                  className="bg-warm-gray-light/10 hover:bg-warm-gray-light/20 flex gap-4 rounded-lg border border-black/5 p-3 transition-colors"
                >
                  <div className="flex shrink-0 flex-col items-center">
                    <span className="text-charcoal/60 mb-2 text-xs font-bold">
                          {formatTime(marker.timestamp)}
                        </span>
                    <button
                      className="hover:border-charcoal/30 text-charcoal/50 hover:text-charcoal flex size-6 items-center justify-center rounded-full border bg-white shadow-sm transition-all"
                      onClick={() => {
                        setOpen(false);
                        onSeek?.(normalizeSeconds(marker.timestamp));
                      }}
                      title="Play from this moment"
                    >
                      <PlayCircle className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div
                      className={cn("w-1 shrink-0 rounded-full", colorClass)}
                    />
                    <p className="text-charcoal text-sm leading-relaxed font-medium">
                      {marker.insight}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
