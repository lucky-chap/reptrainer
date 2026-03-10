"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  generatePersona as generatePersonaAction,
  generatePersonaAvatar as generateAvatarAction,
} from "@/app/actions/api";
import { savePersona, updatePersona } from "@/lib/db";
import type { Persona } from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

export interface GenerationTask {
  id: string;
  teamId?: string;
  teamName?: string;
  status: "generating" | "completed" | "error";
  subStatus?: "analyzing" | "creating_traits" | "generating_avatar";
  type: "persona";
  personaName?: string;
  personaId?: string;
  error?: string;
  startedAt: number;
}

export interface GenerationContextType {
  tasks: GenerationTask[];
  isGenerating: boolean;
  generatePersona: (
    teamId: string,
    teamName: string,
    personalityType?: string,
    gender?: "male" | "female" | "other",
    country?: string,
    competitorUrl?: string,
  ) => Promise<void>;
  dismissTask: (taskId: string) => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(
  undefined,
);

export function GenerationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
    async (
      teamId: string,
      teamName: string,
      personalityType?: string,
      gender?: "male" | "female" | "other",
      country?: string,
      competitorUrl?: string,
    ) => {
      const taskId = uuidv4();

      const task: GenerationTask = {
        id: taskId,
        teamId,
        teamName,
        status: "generating",
        type: "persona",
        startedAt: Date.now(),
      };

      activeRef.current.set(taskId, true);
      setTasks((prev) => [...prev, task]);

      const taskToastId = toast.loading(
        `Generating persona for ${teamName}...`,
      );

      try {
        // Step 1: Text Generation
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, subStatus: "analyzing" } : t,
          ),
        );

        const data = await generatePersonaAction({
          teamId,
          personalityType,
          gender,
          country,
          competitorUrl,
        });

        if (!activeRef.current.get(taskId)) {
          toast.dismiss(taskToastId);
          return;
        }

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, subStatus: "creating_traits" } : t,
          ),
        );

        const personaId = uuidv4();
        const persona: Persona = {
          id: personaId,
          userId: user?.uid || "anonymous",
          teamId: teamId,
          name: data.name,
          role: data.role,
          personalityPrompt: data.personalityPrompt,
          intensityLevel: Number(data.intensityLevel) || 2,
          objectionStrategy:
            data.objectionStrategy || "Skeptical but open to value.",
          gender: data.gender || gender || "female",
          country: country || data.country,
          languageCode: data.languageCode,
          voiceName: data.voiceName || "Zephyr",
          personalityType: data.personalityType,
          traits: {
            aggressiveness:
              Number(data.traits?.aggressiveness) ||
              (Number(data.intensityLevel) || 2) * 3,
            interruptionFrequency:
              data.traits?.interruptionFrequency || "medium",
            objectionStyle: data.traits?.objectionStyle || "analytical",
          },
          // Rich Persona Fields
          companyType: data.companyType,
          industry: data.industry,
          seniorityLevel: data.seniorityLevel,
          personalityTraits: data.personalityTraits,
          motivations: data.motivations,
          objections: data.objections,
          speakingStyle: data.speakingStyle,
          accent: data.accent,
          communicationStyle: data.communicationStyle,
          emotionalState: data.emotionalState,
          environmentContext: data.environmentContext,
          timePressure: data.timePressure,
          conversationBehavior: data.conversationBehavior,
          buyingAttitude: data.buyingAttitude,
          difficultyLevel: data.difficultyLevel,
          physicalDescription: data.physicalDescription,
          createdAt: new Date().toISOString(),
        };

        await savePersona(persona);

        // Step 2: Avatar Generation
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, subStatus: "generating_avatar" } : t,
          ),
        );

        try {
          const avatarData = await generateAvatarAction({
            gender: persona.gender,
            role: persona.role,
            country: persona.country,
            physicalDescription: persona.physicalDescription,
          });

          if (activeRef.current.get(taskId) && avatarData.avatarDataUrl) {
            await updatePersona(personaId, {
              avatarUrl: avatarData.avatarDataUrl,
            });
          }
        } catch (avatarError) {
          console.error("Avatar generation failed:", avatarError);
        }

        if (activeRef.current.get(taskId)) {
          toast.success(`Generated persona: ${persona.name}`, {
            id: taskToastId,
          });
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "completed" as const,
                    personaName: persona.name,
                    personaId: persona.id,
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
        toast.error(
          `Failed to generate persona: ${error instanceof Error ? error.message : "Unknown error"}`,
          {
            id: taskToastId,
          },
        );
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

  return (
    <GenerationContext.Provider
      value={{
        tasks,
        isGenerating,
        generatePersona,
        dismissTask,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error("useGeneration must be used within a GenerationProvider");
  }
  return context;
}
