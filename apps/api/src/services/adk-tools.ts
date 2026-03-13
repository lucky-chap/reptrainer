import { FunctionTool } from "@google/adk";
import { type KnowledgeMetadata } from "@reptrainer/shared";
import { researchCompetitor } from "./vertex.js";

/**
 * ADK Implementation of the research_competitor tool.
 */
export const researchCompetitorTool = new FunctionTool({
  name: "research_competitor",
  description:
    "Research a specific competitor or market claim. Use this ONLY when your internal memory (RAG) lacks the specific data needed to challenge the sales rep. Valid triggers include: verifying competitor claims, challenging differentiation, checking pricing/ROI models, investigating new competitors, validating integrations, researching product announcements, or evaluating market reputation. Do not include in your output to the user.",
  parameters: {
    type: "object",
    properties: {
      competitorName: {
        type: "string",
        description: "The name of the competitor or topic to research.",
      },
    },
    required: ["competitorName"],
  } as any,
  execute: async ({ args, context }: any) => {
    const { competitorName } = args as { competitorName: string };
    const metadata = context.actions.stateDelta.knowledgeMetadata as
      | KnowledgeMetadata
      | undefined;
    let searchCount = (context.actions.stateDelta.searchCount as number) || 0;

    console.log(`[ADK Tool] Researching competitor: ${competitorName}`);

    // Check cache in knowledgeMetadata
    const cached = metadata?.competitorContexts?.find(
      (c: any) =>
        c.name.toLowerCase().includes(competitorName.toLowerCase()) ||
        competitorName.toLowerCase().includes(c.name.toLowerCase()),
    );

    if (cached) {
      console.log(
        `[ADK Tool] Found "${competitorName}" in knowledge base cache.`,
      );
      return cached;
    }

    if (searchCount >= 4) {
      console.log(
        `[ADK Tool] Search limit reached (${searchCount}). Returning limit error.`,
      );
      return {
        error:
          "Search limit reached for this session. Use your internal knowledge or RAG data instead.",
      };
    }

    try {
      const responseData = await researchCompetitor(competitorName);
      context.actions.stateDelta.searchCount = searchCount + 1;
      console.log(
        `[ADK Tool] Live search successful. New count: ${searchCount + 1}`,
      );
      return responseData;
    } catch (err) {
      console.error(
        `[ADK Tool] Live search failed for ${competitorName}:`,
        err,
      );
      return { error: "Failed to research competitor" };
    }
  },
});

/**
 * ADK Implementation of log_sales_insight.
 */
export const logSalesInsightTool = new FunctionTool({
  name: "log_sales_insight",
  description:
    "Record a key insight or moment from the sales call for later review.",
  parameters: {
    type: "object",
    properties: {
      insight: {
        type: "string",
        description:
          "The description of the sales insight, addressed to the user.",
      },
    },
    required: ["insight"],
  } as any,
  execute: async ({ args }: any) => {
    console.log(`[ADK Tool] Logging insight: ${args.insight}`);
    return { success: true };
  },
});

/**
 * ADK Implementation of log_objection.
 */
export const logObjectionTool = new FunctionTool({
  name: "log_objection",
  description:
    "Log a specific objection raised by the persona and how the user handled it.",
  parameters: {
    type: "object",
    properties: {
      objectionType: { type: "string" },
      repResponse: { type: "string" },
      sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
    },
    required: ["objectionType", "repResponse", "sentiment"],
  } as any,
  execute: async ({ args }: any) => {
    console.log(`[ADK Tool] Logging objection: ${args.objectionType}`);
    return { success: true };
  },
});

/**
 * ADK Implementation of update_persona_mood.
 */
export const updatePersonaMoodTool = new FunctionTool({
  name: "update_persona_mood",
  description: "Update the internal emotional state of the persona.",
  parameters: {
    type: "object",
    properties: {
      trust: { type: "number" },
      interest: { type: "number" },
      frustration: { type: "number" },
      dealLikelihood: { type: "number" },
    },
    required: ["trust", "interest", "frustration", "dealLikelihood"],
  } as any,
  execute: async ({ args }: any) => {
    console.log(`[ADK Tool] Updating mood: ${JSON.stringify(args)}`);
    return { success: true };
  },
});

/**
 * ADK Implementation of end_roleplay.
 */
export const endRoleplayTool = new FunctionTool({
  name: "end_roleplay",
  description: "End the sales roleplay session.",
  parameters: { type: "object", properties: {} } as any,
  execute: async () => {
    console.log("[ADK Tool] Ending roleplay session.");
    return { success: true };
  },
});

export const geminiLiveTools = [
  researchCompetitorTool,
  logSalesInsightTool,
  logObjectionTool,
  updatePersonaMoodTool,
  endRoleplayTool,
];

export const geminiLiveToolsDict = Object.fromEntries(
  geminiLiveTools.map((t) => [t.name, t]),
);
