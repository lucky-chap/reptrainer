import env from "@/config/env";
import type { CoachDebriefResponse } from "@reptrainer/shared";

const baseUrl = env.NEXT_PUBLIC_API_URL;
const secretKey = env.NEXT_PUBLIC_API_SECRET_KEY;

export type DebriefProgressStage =
  | "analyzing"
  | "generating_slides"
  | "uploading_audio"
  | "uploading_visuals"
  | "finalizing";

export interface DebriefProgressEvent {
  stage: DebriefProgressStage;
  detail?: string;
}

/**
 * Streams a debrief generation request via SSE, calling onProgress for each stage.
 * Returns the final CoachDebriefResponse when complete.
 */
export async function streamCoachDebrief(
  data: {
    transcript: string;
    personaName: string;
    personaRole: string;
    durationSeconds: number;
    objections?: any[];
    moods?: any[];
  },
  onProgress?: (event: DebriefProgressEvent) => void,
): Promise<CoachDebriefResponse> {
  const res = await fetch(`${baseUrl}/api/session/debrief`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to generate coach debrief: ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error("No response body for SSE stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: CoachDebriefResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from the buffer
    const events = buffer.split("\n\n");
    // Keep the last incomplete chunk in the buffer
    buffer = events.pop() || "";

    for (const eventBlock of events) {
      if (!eventBlock.trim()) continue;

      let eventType = "";
      let eventData = "";

      for (const line of eventBlock.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          eventData = line.slice(6);
        }
      }

      if (!eventType || !eventData) continue;

      try {
        const parsed = JSON.parse(eventData);

        if (eventType === "progress" && onProgress) {
          onProgress(parsed as DebriefProgressEvent);
        } else if (eventType === "result") {
          result = parsed as CoachDebriefResponse;
        } else if (eventType === "error") {
          throw new Error(parsed.error || "Debrief generation failed");
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.warn("[debrief-stream] Failed to parse SSE data:", eventData.substring(0, 100));
        } else {
          throw e;
        }
      }
    }
  }

  if (!result) {
    throw new Error("Debrief stream ended without a result");
  }

  return result;
}
