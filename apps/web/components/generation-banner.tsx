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
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-xl animate-fade-up",
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
            <div className="size-8 rounded-lg bg-charcoal/10 flex items-center justify-center shrink-0">
              <Loader2 className="size-4 text-charcoal animate-spin" />
            </div>
          )}
          {task.status === "completed" && (
            <div className="size-8 rounded-lg bg-emerald-glow/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-4 text-emerald-glow" />
            </div>
          )}
          {task.status === "error" && (
            <div className="size-8 rounded-lg bg-rose-glow/15 flex items-center justify-center shrink-0">
              <AlertCircle className="size-4 text-rose-glow" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {task.status === "generating" && (
              <>
                <p className="text-sm font-medium flex items-center gap-1.5 text-charcoal">
                  <Sparkles className="size-3 text-warm-gray" />
                  Generating {task.type === "product" ? "product" : "persona"}…
                </p>
                {task.type === "persona" && (
                  <p className="text-xs text-warm-gray truncate">
                    For {task.productName}
                  </p>
                )}
              </>
            )}
            {task.status === "completed" && (
              <>
                <p className="text-sm font-medium text-emerald-glow">
                  {task.type === "product" ? "Product" : "Persona"} created!
                </p>
                <p className="text-xs text-warm-gray truncate">
                  {task.type === "product"
                    ? task.productName
                    : task.personaName}{" "}
                  is ready
                </p>
              </>
            )}
            {task.status === "error" && (
              <>
                <p className="text-sm font-medium text-rose-glow">
                  Generation failed
                </p>
                <p className="text-xs text-warm-gray truncate">
                  {task.error || "Please try again"}
                </p>
              </>
            )}
          </div>

          {/* Dismiss */}
          {task.status !== "generating" && (
            <button
              onClick={() => onDismiss(task.id)}
              className="text-warm-gray-light hover:text-charcoal transition-colors shrink-0"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
