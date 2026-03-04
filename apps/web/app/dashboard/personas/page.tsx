"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronRight,
  Loader2,
  Gauge,
  Siren,
  MessageSquareWarning,
  Trash2,
  UserCircle,
  Plus,
  Building2,
  X,
} from "lucide-react";
import type { Product, Persona } from "@/lib/db";
import {
  subscribeProducts,
  subscribePersonas,
  deletePersona,
  savePersona,
} from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { useBackgroundGeneration } from "@/hooks/use-background-generation";
import { GenerationBanner } from "@/components/generation-banner";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

const intensityLabels = [
  "Friendly Skeptic",
  "Tough Negotiator",
  "Hostile Gatekeeper",
];

export default function PersonasPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Manual Form State
  const [manualName, setManualName] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualStrategy, setManualStrategy] = useState("");
  const [manualIntensity, setManualIntensity] = useState(1);
  const [manualProductId, setManualProductId] = useState("");

  const { tasks, isGenerating, generatePersona, dismissTask } =
    useBackgroundGeneration();

  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => setLoading(false), 100);

    const handleError = (err: Error) => {
      console.error("Personas page subscription error:", err);
      setLoading(false);
    };

    const unsubProducts = subscribeProducts(
      user.uid,
      (data) => setProducts(data),
      handleError,
    );

    const unsubPersonas = subscribePersonas(
      user.uid,
      (data) => setPersonas(data),
      handleError,
    );

    return () => {
      clearTimeout(timer);
      unsubProducts();
      unsubPersonas();
    };
  }, [user]);

  const handleGenerate = () => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (product) {
      generatePersona(product);
      setShowCreator(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deletePersona(id);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualProductId) return;

    const persona: Persona = {
      id: uuidv4(),
      userId: user.uid,
      productId: manualProductId,
      name: manualName,
      role: manualRole,
      personalityPrompt: `You are ${manualName}, a ${manualRole}. Your strategy is ${manualStrategy}.`,
      intensityLevel: manualIntensity,
      objectionStrategy: manualStrategy,
      gender: "female",
      traits: {
        aggressiveness: manualIntensity * 3,
        interruptionFrequency:
          manualIntensity === 3
            ? "frequent"
            : manualIntensity === 2
              ? "occasional"
              : "rare",
        objectionStyle:
          manualIntensity === 3
            ? "aggressive"
            : manualIntensity === 2
              ? "firm"
              : "soft",
      },
      createdAt: new Date().toISOString(),
    };

    await savePersona(persona);
    setManualName("");
    setManualRole("");
    setManualStrategy("");
    setManualIntensity(1);
    setManualProductId("");
    setShowForm(false);
    setShowCreator(false);
  };

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-2 block">
              AI Personas
            </span>
            <h1 className="heading-serif text-3xl md:text-4xl lg:text-5xl text-charcoal mb-2">
              Buyer <em>Personas.</em>
            </h1>
            <p className="text-warm-gray text-base max-w-xl">
              Generate AI-powered buyer personas for realistic sales roleplay.
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreator(!showCreator);
              if (showForm) setShowForm(false);
            }}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
              showCreator
                ? "bg-cream-dark text-charcoal"
                : "bg-charcoal text-cream hover:bg-charcoal-light",
            )}
          >
            {showCreator ? (
              <>
                <X className="size-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Create Persona
              </>
            )}
          </button>
        </div>

        {/* Generation Options */}
        {showCreator && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-down">
            {/* Left: AI Generator */}
            <div className="bg-white rounded-2xl border border-border/60 p-8 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-cream-dark flex items-center justify-center">
                  <Sparkles className="size-5 text-charcoal" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-charcoal">
                    Generate with AI
                  </h2>
                  <p className="text-xs text-warm-gray">
                    Select a product to generate a unique buyer persona
                  </p>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-6 mt-auto">
                  <p className="text-sm text-warm-gray mb-3">
                    Add a product first to generate personas.
                  </p>
                  <Link
                    href="/dashboard/products"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal text-cream text-sm font-medium"
                  >
                    Add a product
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-auto">
                  <select
                    value={selectedProductId || ""}
                    onChange={(e) =>
                      setSelectedProductId(e.target.value || null)
                    }
                    className="w-full h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
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
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

            {/* Right: Custom Generator */}
            <div className="bg-white rounded-2xl border border-border/60 p-8 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-cream-dark flex items-center justify-center">
                  <Plus className="size-5 text-charcoal" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-charcoal">
                    Custom Generate
                  </h2>
                  <p className="text-xs text-warm-gray">
                    Manually define buyer characteristics
                  </p>
                </div>
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    showForm
                      ? "bg-cream-dark text-charcoal hover:bg-cream-dark/80"
                      : "bg-white border border-border/60 text-charcoal hover:bg-cream",
                  )}
                >
                  {showForm ? (
                    <>
                      <X className="size-4" />
                      Cancel Manual Entry
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Create Manually
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-border/60 p-8 animate-fade-up">
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-charcoal">
                    Persona Name
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g., Sarah Johnson"
                    required
                    className="w-full h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-charcoal">
                    Professional Role
                  </label>
                  <input
                    type="text"
                    value={manualRole}
                    onChange={(e) => setManualRole(e.target.value)}
                    placeholder="e.g., Head of Procurement"
                    required
                    className="w-full h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal">
                  Related Product
                </label>
                <select
                  value={manualProductId}
                  onChange={(e) => setManualProductId(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
                >
                  <option value="">Select a product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal">
                  Objection Strategy / Personality
                </label>
                <textarea
                  value={manualStrategy}
                  onChange={(e) => setManualStrategy(e.target.value)}
                  placeholder="How does this persona react to sales pitches? What are their main concerns?"
                  rows={3}
                  required
                  className="w-full rounded-xl border border-border/60 bg-cream px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal flex items-center justify-between">
                  Intensity Level
                  <span className="text-xs text-warm-gray font-normal">
                    {intensityLabels[manualIntensity - 1]}
                  </span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setManualIntensity(level)}
                      className={cn(
                        "flex-1 h-12 rounded-xl border text-sm font-medium transition-all",
                        manualIntensity === level
                          ? "bg-charcoal text-cream border-charcoal"
                          : "bg-cream border-border/60 text-charcoal hover:bg-cream-dark",
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors"
                disabled={!manualProductId}
              >
                Save Persona
              </button>
            </form>
          </div>
        )}

        {/* Persona List */}
        {personas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border/60 p-12 flex flex-col items-center justify-center text-center">
            <div className="size-16 rounded-2xl bg-cream-dark flex items-center justify-center mb-4">
              <UserCircle className="size-8 text-warm-gray" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-1">
              No personas yet
            </h3>
            <p className="text-sm text-warm-gray max-w-sm">
              Generate your first buyer persona to start roleplay sessions.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona, i) => {
              const product = products.find((p) => p.id === persona.productId);
              return (
                <div
                  key={persona.id}
                  className="bg-white rounded-2xl border border-border/60 p-6 hover:shadow-lg hover:shadow-charcoal/5 transition-all duration-300 group animate-fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-full bg-charcoal flex items-center justify-center text-lg font-bold text-cream">
                        {persona.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-charcoal">
                          {persona.name}
                        </h3>
                        <p className="text-xs text-warm-gray">{persona.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(persona.id)}
                      className="text-warm-gray-light hover:text-rose-glow opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

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

                  <Link
                    href="/dashboard/train"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-charcoal hover:bg-charcoal hover:text-cream transition-all duration-200"
                  >
                    Start Roleplay
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GenerationBanner tasks={tasks} onDismiss={dismissTask} />
    </>
  );
}
