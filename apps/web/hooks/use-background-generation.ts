"use client";

import { useGeneration } from "@/context/generation-context";
export type { GenerationTask } from "@/context/generation-context";

export function useBackgroundGeneration() {
  return useGeneration();
}
