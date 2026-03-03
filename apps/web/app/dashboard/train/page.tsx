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
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const { tasks, isGenerating, dismissTask } = useBackgroundGeneration();

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

  const handleStartRoleplay = () => {
    if (!selectedPersonaId || !selectedProductId) return;
    const persona = personas.find((p) => p.id === selectedPersonaId);
    const product = products.find((p) => p.id === selectedProductId);
    if (persona && product) {
      setActivePersona(persona);
      setActiveProduct(product);
    }
  };

  const handleDeletePersona = async (id: string) => {
    await deletePersona(id);
    loadData();
  };

  // If actively in a roleplay session, show the session component
  if (activePersona && activeProduct) {
    return (
      <>
        <RoleplaySession
          persona={activePersona}
          product={activeProduct}
          onBack={() => {
            setActivePersona(null);
            setActiveProduct(null);
          }}
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

        {/* Configure Section */}
        <div className="bg-white rounded-2xl border border-border/60 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-cream-dark flex items-center justify-center">
              <Phone className="size-5 text-charcoal" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-charcoal">
                Configure Session
              </h2>
              <p className="text-xs text-warm-gray">
                Select who you want to pitch to, and what you are pitching.
              </p>
            </div>
          </div>

          {products.length === 0 || personas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-warm-gray mb-3">
                You need at least one persona and one product to start a
                session.
              </p>
              <div className="flex items-center justify-center gap-4">
                <a
                  href="/dashboard/products"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors"
                >
                  Manage Products
                </a>
                <a
                  href="/dashboard/personas"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/60 text-charcoal text-sm font-medium hover:bg-cream transition-colors"
                >
                  Manage Personas
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedPersonaId || ""}
                onChange={(e) => setSelectedPersonaId(e.target.value || null)}
                className="flex-1 h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
              >
                <option value="">Select a persona…</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.role}
                  </option>
                ))}
              </select>
              <select
                value={selectedProductId || ""}
                onChange={(e) => setSelectedProductId(e.target.value || null)}
                className="flex-1 h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
              >
                <option value="">Select a product to pitch…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.companyName} — {p.industry}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStartRoleplay}
                disabled={!selectedProductId || !selectedPersonaId}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light disabled:opacity-40 disabled:cursor-not-allowed transition-all min-w-[180px]"
              >
                <Phone className="size-4" />
                Start Roleplay
              </button>
            </div>
          )}
        </div>
      </div>

      <GenerationBanner tasks={tasks} onDismiss={dismissTask} />
    </>
  );
}
