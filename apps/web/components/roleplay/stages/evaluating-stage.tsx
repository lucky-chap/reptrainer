"use client";

import { Loader2 } from "lucide-react";

interface EvaluatingStageProps {
  loadingStage: "audio" | "evaluating" | "saving" | "finalizing";
  loadingProgress: number;
}

export function EvaluatingStage({
  loadingStage,
  loadingProgress,
}: EvaluatingStageProps) {
  const stageLabels = {
    audio: "Uploading call audio...",
    evaluating: "Analyzing performance with Senior Sales Coach...",
    saving: "Saving session results...",
    finalizing: "Finalizing your report...",
  };

  return (
    <div className="animate-fade-up flex flex-col items-center justify-center py-20">
      <div className="relative mb-10">
        <div className="from-charcoal/5 to-charcoal/10 relative flex size-32 items-center justify-center overflow-hidden rounded-full bg-linear-to-br">
          {/* Liquid Fill Progress */}
          <div
            className="bg-charcoal/10 absolute right-0 bottom-0 left-0 transition-all duration-700 ease-out"
            style={{ height: `${loadingProgress}%` }}
          />
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-charcoal text-2xl font-bold">
              {loadingProgress}%
            </span>
          </div>
        </div>
        <div className="border-charcoal/5 absolute inset-0 animate-pulse rounded-full border-2" />
      </div>

      <div className="max-w-sm space-y-4 px-6 text-center">
        <h3 className="text-charcoal text-xl font-bold">
          {stageLabels[loadingStage]}
        </h3>
        <p className="text-warm-gray text-sm leading-relaxed">
          {loadingStage === "evaluating"
            ? "Our AI is reviewing every word of your transcript to provide specific, actionable feedback on your sales technique."
            : "Hang tight, we're making sure all your call data is safely stored in your dashboard."}
        </p>

        {/* Progress Bar Mini */}
        <div className="bg-cream border-border/30 mt-8 h-1.5 w-full overflow-hidden rounded-full border">
          <div
            className="bg-charcoal h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-700 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <Loader2 className="text-warm-gray size-3 animate-spin" />
          <span className="text-warm-gray text-[10px] font-semibold tracking-widest uppercase">
            Processing Securely
          </span>
        </div>
      </div>
    </div>
  );
}
