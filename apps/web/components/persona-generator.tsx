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
  "Curious Prospect",
  "Tough Negotiator",
  "Stubborn Executive",
  "Hostile Gatekeeper",
];
const intensityColors = [
  "text-amber-glow bg-amber-glow/10 border-amber-glow/20",
  "text-indigo-glow bg-indigo-glow/10 border-indigo-glow/20",
  "text-blue-glow bg-blue-glow/10 border-blue-glow/20",
  "text-violet-glow bg-violet-glow/10 border-violet-glow/20",
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
        <div className="border-emerald-glow/30 border-t-emerald-glow size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Buyer Personas</h2>
        <p className="text-muted-foreground mt-1">
          Generate AI-powered buyer personas for realistic sales roleplay.
        </p>
      </div>

      {/* Generator */}
      <Card className="glass p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="from-violet-glow/15 to-violet-glow/5 border-violet-glow/15 flex size-10 items-center justify-center rounded-xl border bg-gradient-to-br">
            <Sparkles className="text-violet-glow size-5" />
          </div>
          <div>
            <h3 className="font-semibold">Generate New Persona</h3>
            <p className="text-muted-foreground text-xs">
              Select a product to generate a unique buyer persona
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add a product first to generate personas.
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedProductId || ""}
              onChange={(e) => setSelectedProductId(e.target.value || null)}
              className="border-border bg-input focus:ring-ring h-10 flex-1 rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none"
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
              className="min-w-[160px] gap-2"
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
        <Card className="glass flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-violet-glow/10 mb-4 flex size-16 items-center justify-center rounded-2xl">
            <UserCircle className="text-violet-glow/60 size-8" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No personas yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
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
                className="glass hover:border-violet-glow/20 group animate-fade-up p-5 transition-all duration-300"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="from-violet-glow/20 to-blue-glow/10 border-violet-glow/15 text-violet-glow flex size-11 items-center justify-center rounded-full border bg-gradient-to-br text-lg font-bold">
                      {persona.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{persona.name}</h3>
                      <p className="text-muted-foreground text-xs">
                        {persona.role}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive opacity-0 transition-all group-hover:opacity-100"
                    onClick={() => handleDelete(persona.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Traits */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="text-muted-foreground size-3.5" />
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        intensityColors[persona.intensityLevel - 1]
                      }`}
                    >
                      {intensityLabels[persona.intensityLevel - 1]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Siren className="text-muted-foreground size-3.5" />
                    <span className="text-muted-foreground text-xs">
                      Interruptions:{" "}
                      <span className="text-foreground capitalize">
                        {persona.traits.interruptionFrequency}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquareWarning className="text-muted-foreground size-3.5" />
                    <span className="text-muted-foreground text-xs">
                      Style:{" "}
                      <span className="text-foreground capitalize">
                        {persona.traits.objectionStyle}
                      </span>
                    </span>
                  </div>
                </div>

                {product && (
                  <p className="text-muted-foreground mb-3 text-[11px]">
                    Product: {product.companyName}
                  </p>
                )}

                <p className="text-muted-foreground mb-4 line-clamp-2 text-xs">
                  {persona.objectionStrategy}
                </p>

                <Button
                  onClick={() => onStartRoleplay?.(persona)}
                  variant="secondary"
                  size="sm"
                  className="group-hover:bg-emerald-glow/10 group-hover:text-emerald-glow group-hover:border-emerald-glow/20 w-full gap-2 transition-all"
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
