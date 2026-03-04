"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserCircle,
  Sparkles,
  Trash2,
  Gauge,
  Siren,
  MessageSquareWarning,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Product, Persona } from "@/lib/db";
import { getAllProducts, getAllPersonas, deletePersona } from "@/lib/db";
import { useAuth } from "@/context/auth-context";

interface PersonaGeneratorProps {
  onStartRoleplay?: (persona: Persona) => void;
  onGeneratePersona?: (product: Product) => void;
  isGenerating?: boolean;
}

const intensityLabels = [
  "Friendly Skeptic",
  "Tough Negotiator",
  "Hostile Gatekeeper",
];
const intensityColors = [
  "text-amber-glow bg-amber-glow/10 border-amber-glow/20",
  "text-blue-glow bg-blue-glow/10 border-blue-glow/20",
  "text-rose-glow bg-rose-glow/10 border-rose-glow/20",
];

export function PersonaGenerator({
  onStartRoleplay,
  onGeneratePersona,
  isGenerating = false,
}: PersonaGeneratorProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [prods, pers] = await Promise.all([
      getAllProducts(user.uid),
      getAllPersonas(user.uid),
    ]);
    setProducts(prods);
    setPersonas(pers);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-load data when generation completes (poll while generating)
  useEffect(() => {
    if (!isGenerating) {
      // Generation just finished — reload data to pick up new persona
      loadData();
      return;
    }

    // While generating, poll every 2s to catch completion
    const interval = setInterval(() => {
      loadData();
    }, 2000);

    return () => clearInterval(interval);
  }, [isGenerating, loadData]);

  const handleGenerate = () => {
    if (!selectedProductId || !onGeneratePersona) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    onGeneratePersona(product);
  };

  const handleDelete = async (id: string) => {
    await deletePersona(id);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-emerald-glow/30 border-t-emerald-glow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Buyer Personas</h2>
        <p className="text-muted-foreground mt-1">
          Generate AI-powered buyer personas for realistic sales roleplay.
        </p>
      </div>

      {/* Generator */}
      <Card className="p-6 glass">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-gradient-to-br from-violet-glow/15 to-violet-glow/5 border border-violet-glow/15 flex items-center justify-center">
            <Sparkles className="size-5 text-violet-glow" />
          </div>
          <div>
            <h3 className="font-semibold">Generate New Persona</h3>
            <p className="text-xs text-muted-foreground">
              Select a product to generate a unique buyer persona
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a product first to generate personas.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedProductId || ""}
              onChange={(e) => setSelectedProductId(e.target.value || null)}
              className="flex-1 h-10 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.companyName} — {p.industry}
                </option>
              ))}
            </select>
            <Button
              onClick={handleGenerate}
              disabled={!selectedProductId || isGenerating}
              className="gap-2 min-w-[160px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Persona
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Persona List */}
      {personas.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center glass">
          <div className="size-16 rounded-2xl bg-violet-glow/10 flex items-center justify-center mb-4">
            <UserCircle className="size-8 text-violet-glow/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No personas yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Generate your first buyer persona to start roleplay sessions.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {personas.map((persona, i) => {
            const product = products.find((p) => p.id === persona.productId);
            return (
              <Card
                key={persona.id}
                className="p-5 glass hover:border-violet-glow/20 transition-all duration-300 group animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-gradient-to-br from-violet-glow/20 to-blue-glow/10 border border-violet-glow/15 flex items-center justify-center text-lg font-bold text-violet-glow">
                      {persona.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{persona.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {persona.role}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => handleDelete(persona.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Traits */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Gauge className="size-3.5 text-muted-foreground" />
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        intensityColors[persona.intensityLevel - 1]
                      }`}
                    >
                      {intensityLabels[persona.intensityLevel - 1]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Siren className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Interruptions:{" "}
                      <span className="text-foreground capitalize">
                        {persona.traits.interruptionFrequency}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquareWarning className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Style:{" "}
                      <span className="text-foreground capitalize">
                        {persona.traits.objectionStyle}
                      </span>
                    </span>
                  </div>
                </div>

                {product && (
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Product: {product.companyName}
                  </p>
                )}

                <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                  {persona.objectionStrategy}
                </p>

                <Button
                  onClick={() => onStartRoleplay?.(persona)}
                  variant="secondary"
                  size="sm"
                  className="w-full gap-2 group-hover:bg-emerald-glow/10 group-hover:text-emerald-glow group-hover:border-emerald-glow/20 transition-all"
                >
                  Start Roleplay
                  <ChevronRight className="size-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
