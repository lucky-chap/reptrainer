"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  ChevronRight,
  Loader2,
  Gauge,
  Siren,
  MessageSquareWarning,
  Phone,
  UserCircle,
} from "lucide-react";
import type { Product, Persona } from "@/lib/db";
import { getAllProducts, getAllPersonas, deletePersona } from "@/lib/db";
import { RoleplaySession } from "@/components/roleplay-session";
import { GenerationBanner } from "@/components/generation-banner";
import { useBackgroundGeneration } from "@/hooks/use-background-generation";

const intensityLabels = [
  "Friendly Skeptic",
  "Tough Negotiator",
  "Hostile Gatekeeper",
];

export default function TrainPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);

  const { tasks, isGenerating, generatePersona, dismissTask } =
    useBackgroundGeneration();

  const loadData = useCallback(async () => {
    const [prods, pers] = await Promise.all([
      getAllProducts(),
      getAllPersonas(),
    ]);
    setProducts(prods);
    setPersonas(pers);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload on generation changes
  useEffect(() => {
    if (!isGenerating) {
      loadData();
      return;
    }
    const interval = setInterval(() => loadData(), 2000);
    return () => clearInterval(interval);
  }, [isGenerating, loadData]);

  const handleGenerate = () => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (product) generatePersona(product);
  };

  const handleDeletePersona = async (id: string) => {
    await deletePersona(id);
    loadData();
  };

  // If actively in a roleplay session, show the session component
  if (activePersona) {
    return (
      <>
        <RoleplaySession
          persona={activePersona}
          onBack={() => setActivePersona(null)}
        />
        <GenerationBanner tasks={tasks} onDismiss={dismissTask} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-fade-up">
        {/* Page header */}
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-2 block">
            Training
          </span>
          <h1 className="heading-serif text-3xl md:text-4xl lg:text-5xl text-charcoal mb-2">
            Start a <em>Roleplay.</em>
          </h1>
          <p className="text-warm-gray text-base max-w-xl">
            Generate an AI buyer persona and jump into a live voice
            conversation. Practice objection handling, closing, and more.
          </p>
        </div>

        {/* Generate Section */}
        <div className="bg-white rounded-2xl border border-border/60 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-cream-dark flex items-center justify-center">
              <Sparkles className="size-5 text-charcoal" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-charcoal">
                Generate Buyer Persona
              </h2>
              <p className="text-xs text-warm-gray">
                Select a product, then generate a unique AI buyer
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-warm-gray mb-3">
                No products configured yet.
              </p>
              <a
                href="/dashboard/products"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors"
              >
                Add your first product
              </a>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedProductId || ""}
                onChange={(e) => setSelectedProductId(e.target.value || null)}
                className="flex-1 h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.companyName} — {p.industry}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                disabled={!selectedProductId || isGenerating}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light disabled:opacity-40 disabled:cursor-not-allowed transition-all min-w-[180px]"
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
              </button>
            </div>
          )}
        </div>

        {/* Personas Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-charcoal">
              Available Personas
            </h2>
            <span className="text-xs text-warm-gray">
              {personas.length} total
            </span>
          </div>

          {personas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border/60 p-12 flex flex-col items-center justify-center text-center">
              <div className="size-16 rounded-2xl bg-cream-dark flex items-center justify-center mb-4">
                <UserCircle className="size-8 text-warm-gray" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-1">
                No personas yet
              </h3>
              <p className="text-sm text-warm-gray max-w-sm">
                Generate your first buyer persona above to start roleplay
                sessions.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {personas.map((persona, i) => {
                const product = products.find(
                  (p) => p.id === persona.productId,
                );
                return (
                  <div
                    key={persona.id}
                    className="bg-white rounded-2xl border border-border/60 p-6 hover:shadow-lg hover:shadow-charcoal/5 transition-all duration-300 group animate-fade-up"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {/* Top */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-11 rounded-full bg-charcoal flex items-center justify-center text-lg font-bold text-cream">
                          {persona.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-charcoal">
                            {persona.name}
                          </h3>
                          <p className="text-xs text-warm-gray">
                            {persona.role}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePersona(persona.id)}
                        className="text-warm-gray-light hover:text-rose-glow transition-colors opacity-0 group-hover:opacity-100 text-xs"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Traits */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Gauge className="size-3.5 text-warm-gray" />
                        <span className="text-xs font-medium text-charcoal px-2 py-0.5 rounded-full bg-cream-dark">
                          {intensityLabels[persona.intensityLevel - 1]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Siren className="size-3.5 text-warm-gray" />
                        <span className="text-xs text-warm-gray">
                          Interruptions:{" "}
                          <span className="text-charcoal capitalize">
                            {persona.traits.interruptionFrequency}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquareWarning className="size-3.5 text-warm-gray" />
                        <span className="text-xs text-warm-gray">
                          Style:{" "}
                          <span className="text-charcoal capitalize">
                            {persona.traits.objectionStyle}
                          </span>
                        </span>
                      </div>
                    </div>

                    {product && (
                      <p className="text-[11px] text-warm-gray mb-3">
                        Product: {product.companyName}
                      </p>
                    )}

                    <p className="text-xs text-warm-gray line-clamp-2 mb-4">
                      {persona.objectionStrategy}
                    </p>

                    {/* CTA */}
                    <button
                      onClick={() => setActivePersona(persona)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-charcoal hover:bg-charcoal hover:text-cream transition-all duration-200 group/btn"
                    >
                      <Phone className="size-4" />
                      Start Roleplay
                      <ChevronRight className="size-4 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <GenerationBanner tasks={tasks} onDismiss={dismissTask} />
    </>
  );
}
