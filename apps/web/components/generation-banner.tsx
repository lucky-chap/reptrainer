"use client";

import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Package,
} from "lucide-react";
import type { GenerationTask } from "@/hooks/use-background-generation";
import { cn } from "@/lib/utils";

interface GenerationBannerProps {
  tasks: GenerationTask[];
  onDismiss: (taskId: string) => void;
}

export function GenerationBanner({ tasks, onDismiss }: GenerationBannerProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-50 flex w-full max-w-sm flex-col gap-2 sm:bottom-6">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "animate-fade-up pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl",
            task.status === "generating" &&
              "bg-charcoal/5 border-charcoal/10 shadow-charcoal/5",
            task.status === "completed" &&
              "bg-emerald-glow/10 border-emerald-glow/25 shadow-emerald-glow/10",
            task.status === "error" &&
              "bg-rose-glow/10 border-rose-glow/25 shadow-rose-glow/10",
          )}
        >
          {/* Icon */}
          {task.status === "generating" && (
            <div className="bg-charcoal/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Loader2 className="text-charcoal size-4 animate-spin" />
            </div>
          )}
          {task.status === "completed" && (
            <div className="bg-emerald-glow/15 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <CheckCircle2 className="text-emerald-glow size-4" />
            </div>
          )}
          {task.status === "error" && (
            <div className="bg-rose-glow/15 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <AlertCircle className="text-rose-glow size-4" />
            </div>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            {task.status === "generating" && (
              <>
                <p className="text-charcoal flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="text-warm-gray size-3" />
                  Generating {task.type === "product" ? "product" : "persona"}…
                </p>
                {task.type === "persona" && (
                  <div className="mt-1 space-y-1">
                    <p className="text-warm-gray truncate text-xs">
                      For {task.productName}
                    </p>
                    <p className="text-charcoal/60 animate-pulse text-[10px] font-medium">
                      {task.subStatus === "analyzing" && "Analyzing Industry…"}
                      {task.subStatus === "creating_traits" &&
                        "Creating Persona Traits…"}
                      {task.subStatus === "generating_avatar" &&
                        "Generating AI Avatar…"}
                    </p>
                  </div>
                )}
              </>
            )}
            {task.status === "completed" && (
              <>
                <p className="text-emerald-glow text-sm font-medium">
                  {task.type === "product" ? "Product" : "Persona"} created!
                </p>
                <p className="text-warm-gray truncate text-xs">
                  {task.type === "product"
                    ? task.productName
                    : task.personaName}{" "}
                  is ready
                </p>
              </>
            )}
            {task.status === "error" && (
              <>
                <p className="text-rose-glow text-sm font-medium">
                  Generation failed
                </p>
                <p className="text-warm-gray truncate text-xs">
                  {task.error || "Please try again"}
                </p>
              </>
            )}
          </div>

          {/* Dismiss */}
          {task.status !== "generating" && (
            <button
              onClick={() => onDismiss(task.id)}
              className="text-warm-gray-light hover:text-charcoal shrink-0 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
