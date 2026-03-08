import type { Session, CallSession, Product, Persona } from "../db";
import { getOverallScore } from "./scoring";
/**
 * Calculates average scores per category (persona or product).
 */
export function calculateCategoryScores(
  sessions: (Session | CallSession)[],
  category: "product" | "persona",
  products?: Product[],
): { name: string; score: number }[] {
  const scores: Record<string, { total: number; count: number }> = {};

  sessions.forEach((s) => {
    const evaluation = "evaluation" in s ? s.evaluation : s.legacyEvaluation;
    if (!evaluation) return;

    let name = "Unknown";
    if (category === "product") {
      const productId = "productId" in s ? s.productId : "default";
      const product = products?.find((p) => p.id === productId);
      name = product?.companyName || productId;
      if (name === "default") name = "Standard Drill";
    } else {
      name = s.personaName || "Default Persona";
    }

    if (!scores[name]) {
      scores[name] = { total: 0, count: 0 };
    }
    scores[name].total += getOverallScore(evaluation);
    scores[name].count += 1;
  });

  return Object.entries(scores)
    .map(([name, data]) => ({
      name,
      score: Math.round((data.total / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Limit to top 5
}

/**
 * Calculates team training coverage across products and personas.
 */
export function calculateTeamCoverage(
  sessions: (Session | CallSession)[],
  products: Product[],
  personas: Persona[],
): {
  productName: string;
  coverage: number;
  totalPersonas: number;
  practicedPersonas: number;
}[] {
  if (products.length === 0) return [];

  return products.map((product) => {
    const productPersonas = personas.filter((p) => p.productId === product.id);
    if (productPersonas.length === 0) {
      return {
        productName: product.companyName,
        coverage: 0,
        totalPersonas: 0,
        practicedPersonas: 0,
      };
    }

    const practicedPersonaIds = new Set(
      sessions
        .filter((s) => s.productId === product.id)
        .map((s) => s.personaId),
    );

    const practicedCount = productPersonas.filter((p) =>
      practicedPersonaIds.has(p.id),
    ).length;
    const coverage = Math.round(
      (practicedCount / productPersonas.length) * 100,
    );

    return {
      productName: product.companyName,
      coverage,
      totalPersonas: productPersonas.length,
      practicedPersonas: practicedCount,
    };
  });
}
