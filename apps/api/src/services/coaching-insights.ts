import { genAI, extractJson } from "./vertex.js";
import { getKnowledgeMetadata } from "./knowledge.js";
import { ragService } from "./rag.js";
import {
  GEMINI_TEXT_MODEL,
  type RAGCoachingInsightsRequest,
  type RAGCoachingInsight,
  type RAGInsightType,
} from "@reptrainer/shared";

/**
 * Generates RAG-enhanced coaching insights by combining team knowledge base
 * data with session score summaries to produce product-aware recommendations.
 */
export async function generateRAGCoachingInsights(
  request: RAGCoachingInsightsRequest,
): Promise<RAGCoachingInsight[]> {
  const { teamId, isTeamView, scoreSummaries } = request;

  if (!scoreSummaries || scoreSummaries.length === 0) return [];

  // 1. Fetch structured knowledge metadata
  let metadataContext = "";
  try {
    const metadata = await getKnowledgeMetadata(teamId);
    if (metadata) {
      const parts: string[] = [];
      if (metadata.productCategory)
        parts.push(`Product Category: ${metadata.productCategory}`);
      if (metadata.icp) parts.push(`Ideal Customer Profile: ${metadata.icp}`);
      if (metadata.valueProps?.length)
        parts.push(
          `Value Propositions:\n- ${metadata.valueProps.join("\n- ")}`,
        );
      if (metadata.differentiators?.length)
        parts.push(
          `Key Differentiators:\n- ${metadata.differentiators.join("\n- ")}`,
        );
      if (metadata.objections?.length)
        parts.push(`Common Objections:\n- ${metadata.objections.join("\n- ")}`);
      if (metadata.competitors?.length)
        parts.push(`Competitors: ${metadata.competitors.join(", ")}`);
      if (metadata.competitorContexts?.length) {
        const compSummaries = metadata.competitorContexts
          .map(
            (c: any) =>
              `  - ${c.name}: ${c.productDescription || ""}${c.painPoints?.length ? ` | Pain points: ${c.painPoints.join(", ")}` : ""}`,
          )
          .join("\n");
        parts.push(`Competitor Intelligence:\n${compSummaries}`);
      }
      if (parts.length > 0) {
        metadataContext = parts.join("\n\n");
      }
    }
  } catch (error) {
    console.error("[coaching-insights] Metadata fetch failed:", error);
  }

  // If no metadata exists, RAG insights can't add value — return empty
  if (!metadataContext) return [];

  // 2. Build a RAG query from weakest skills across all summaries
  const allWeakSkills = [
    ...new Set(scoreSummaries.flatMap((s) => s.weakestSkills)),
  ];
  let ragSnippets = "";
  try {
    const query = `sales coaching advice for improving ${allWeakSkills.join(", ")} skills, product value propositions, competitive differentiators, and common buyer objections`;
    const ragContext = await ragService.retrieve(teamId, query, 5);
    if (ragContext.length > 0) {
      ragSnippets = ragContext.join("\n\n");
    }
  } catch (error) {
    console.error("[coaching-insights] RAG retrieval failed:", error);
  }

  // 3. Build the Gemini prompt
  const summariesText = scoreSummaries
    .map(
      (s) =>
        `- ${s.userName} (${s.sessionCount} sessions, trend: ${s.recentTrend}): overall=${s.avgScores.overall}, discovery=${s.avgScores.discovery}, objection_handling=${s.avgScores.objection_handling}, positioning=${s.avgScores.positioning}, closing=${s.avgScores.closing}, listening=${s.avgScores.listening}. Weakest: ${s.weakestSkills.join(", ")}`,
    )
    .join("\n");

  const prompt = `You are a senior sales enablement strategist. Your job is to generate coaching insights for a sales team by cross-referencing their performance data with the team's actual product knowledge base.

─── PERFORMANCE DATA ───
View: ${isTeamView ? "Team-wide (Analytics for Team Leader)" : "Individual (Growth for Sales Member)"}
${summariesText}

─── PRODUCT & MARKET KNOWLEDGE ───
${metadataContext}
${ragSnippets ? `\n─── ADDITIONAL KNOWLEDGE BASE EXCERPTS ───\n${ragSnippets}` : ""}

─── INSTRUCTIONS ───

Generate 2-3 highly specific coaching insights. Each insight MUST:
1. Deeply reference concrete product knowledge (value props, differentiators, or common objections) from the team's knowledge base.
2. Avoid generic sales advice; every recommendation must include specific product terminology or messaging strategies.
3. Bridge a detected performance gap (from the data) with a specific piece of product knowledge (from the KB).
4. ${isTeamView ? "Tailor for a TEAM LEADER: focus on broader patterns, identifying shared weaknesses across the team, and suggesting group-level training or systemic changes." : "Tailor for a SALES MEMBER: focus on personal growth, specific individual skill gaps, and custom practice scenarios they can run themselves."}

Available insight types:
- "needs_coaching": A rep needs focused coaching on a skill, with product-specific guidance.
- "product_gap": The rep is not leveraging specific product knowledge (value props, differentiators) during calls.
- "competitive_edge": An opportunity to use competitor intelligence to improve performance.
- "team_weakness": A team-wide skill gap that can be addressed with product-specific training.
- "improvement": Positive trend that should be reinforced with advanced product scenarios.
- "skill_avoidance": A rep is avoiding a skill area, with product-specific practice recommendations.

CRITICAL: Every recommendation must reference concrete product knowledge — NO generic advice like "practice more" or "focus on discovery". Instead, say things like "Practice surfacing the [Product Differentiator] during discovery" or "Apply the [Specific Value Prop] when handling pricing objections."

─── OUTPUT FORMAT ───

Return ONLY a valid JSON array:
[
  {
    "type": "<one of the types above>",
    "user": "<rep name, or 'Team' if isTeamView is true>",
    "title": "<concise headline, max 60 chars>",
    "explanation": "<1-2 sentences explaining the gap, referencing specific performance data points>",
    "recommendation": "<1-2 sentences with concrete, product-specific action items>",
    "priority": <1-10, higher = more important>,
    "knowledgeReferences": ["<specific KB fact used>", "<another KB fact>"]
  }
]`;

  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const text = response.text || "";
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error(
        "[coaching-insights] Failed to extract JSON from response:",
        text.substring(0, 200),
      );
      return [];
    }

    const parsed = JSON.parse(jsonStr);
    const insights: RAGCoachingInsight[] = (Array.isArray(parsed) ? parsed : [])
      .filter(
        (item: any) =>
          item.type && item.user && item.title && item.recommendation,
      )
      .map((item: any) => ({
        type: item.type as RAGInsightType,
        user: item.user,
        title: item.title,
        explanation: item.explanation || "",
        recommendation: item.recommendation,
        priority: Math.min(10, Math.max(1, Number(item.priority) || 5)),
        source: "rag" as const,
        knowledgeReferences: Array.isArray(item.knowledgeReferences)
          ? item.knowledgeReferences
          : undefined,
      }));

    console.log(
      `[coaching-insights] Generated ${insights.length} RAG insights for team ${teamId}`,
    );
    return insights;
  } catch (error) {
    console.error("[coaching-insights] Gemini generation failed:", error);
    return [];
  }
}
