"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  generatePersona as generatePersonaAction,
  generateProduct as generateProductAction,
} from "@/app/actions/api";
import type { Product, Persona } from "@/lib/db";
import { savePersona, saveProduct } from "@/lib/db";
import { useAuth } from "@/context/auth-context";

export interface GenerationTask {
  id: string;
  productId?: string;
  productName?: string;
  status: "generating" | "completed" | "error";
  type: "persona" | "product";
  personaName?: string;
  error?: string;
  startedAt: number;
}

export function useBackgroundGeneration() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const activeRef = useRef<Map<string, boolean>>(new Map());

  // Auto-dismiss completed/error tasks after 5 seconds
  useEffect(() => {
    const completedTasks = tasks.filter((t) => t.status !== "generating");
    if (completedTasks.length === 0) return;

    const timers = completedTasks.map((t) =>
      setTimeout(() => {
        setTasks((prev) => prev.filter((pt) => pt.id !== t.id));
        activeRef.current.delete(t.id);
      }, 5000),
    );

    return () => timers.forEach(clearTimeout);
  }, [tasks]);

  const generatePersona = useCallback(
    async (product: Product) => {
      const taskId = uuidv4();

      const task: GenerationTask = {
        id: taskId,
        productId: product.id,
        productName: product.companyName,
        status: "generating",
        type: "persona",
        startedAt: Date.now(),
      };

      activeRef.current.set(taskId, true);
      setTasks((prev) => [...prev, task]);

      try {
        const data = await generatePersonaAction({
          companyName: product.companyName,
          description: product.description,
          targetCustomer: product.targetCustomer,
          industry: product.industry,
          objections: product.objections,
        });

        // Check if task was cancelled
        if (!activeRef.current.get(taskId)) return;
        const persona: Persona = {
          id: uuidv4(),
          userId: user?.uid || "anonymous",
          productId: product.id,
          name: data.name,
          role: data.role,
          personalityPrompt: data.personalityPrompt,
          intensityLevel: data.intensityLevel,
          objectionStrategy: data.objectionStrategy,
          gender: data.gender || "female",
          traits: data.traits,
          createdAt: new Date().toISOString(),
        };

        await savePersona(persona);

        if (activeRef.current.get(taskId)) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "completed" as const,
                    personaName: persona.name,
                  }
                : t,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to generate persona:", error);
        if (activeRef.current.get(taskId)) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "error" as const,
                    error:
                      error instanceof Error
                        ? error.message
                        : "Generation failed",
                  }
                : t,
            ),
          );
        }
      } finally {
        activeRef.current.delete(taskId);
      }
    },
    [user],
  );

  const generateProduct = useCallback(
    async (data: { companyName?: string; briefDescription?: string }) => {
      const taskId = uuidv4();

      const task: GenerationTask = {
        id: taskId,
        status: "generating",
        type: "product",
        startedAt: Date.now(),
      };

      activeRef.current.set(taskId, true);
      setTasks((prev) => [...prev, task]);

      try {
        const generatedData = await generateProductAction(data);

        if (!activeRef.current.get(taskId)) return;

        const product: Product = {
          id: uuidv4(),
          userId: user?.uid || "anonymous",
          companyName: generatedData.companyName,
          description: generatedData.description,
          targetCustomer: generatedData.targetCustomer,
          industry: generatedData.industry,
          objections: generatedData.objections,
          createdAt: new Date().toISOString(),
        };

        await saveProduct(product);

        if (activeRef.current.get(taskId)) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "completed" as const,
                    productName: product.companyName,
                  }
                : t,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to generate product:", error);
        if (activeRef.current.get(taskId)) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "error" as const,
                    error:
                      error instanceof Error
                        ? error.message
                        : "Generation failed",
                  }
                : t,
            ),
          );
        }
      } finally {
        activeRef.current.delete(taskId);
      }
    },
    [user],
  );

  const dismissTask = useCallback((taskId: string) => {
    activeRef.current.delete(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const isGenerating = tasks.some((t) => t.status === "generating");

  return {
    tasks,
    isGenerating,
    generatePersona,
    generateProduct,
    dismissTask,
  };
}
