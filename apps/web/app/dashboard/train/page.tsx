"use client";

import { useState, useEffect } from "react";
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
import { subscribeProducts, subscribePersonas, deletePersona } from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { RoleplaySession } from "@/components/roleplay-session";
import { GenerationBanner } from "@/components/generation-banner";
import { useBackgroundGeneration } from "@/hooks/use-background-generation";
import Link from "next/link";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const intensityLabels = [
  "Friendly Skeptic",
  "Tough Negotiator",
  "Hostile Gatekeeper",
];

export default function TrainPage() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) return;

    // Immediately show UI; data will quickly populate from cache
    const timer = setTimeout(() => setLoading(false), 100);

    const handleError = (err: Error) => {
      console.error("Train page subscription error:", err);
      setLoading(false);
    };

    const unsubProducts = subscribeProducts(
      user.uid,
      (data) => setProducts(data),
      handleError,
    );

    const unsubPersonas = subscribePersonas(
      user.uid,
      (data) => {
        setPersonas(data);
      },
      handleError,
    );

    return () => {
      clearTimeout(timer);
      unsubProducts();
      unsubPersonas();
    };
  }, [user]);

  const handleStartRoleplay = () => {
    if (!selectedPersonaId || !selectedProductId) return;
    const persona = personas.find((p) => p.id === selectedPersonaId);
    const product = products.find((p) => p.id === selectedProductId);
    if (persona && product) {
      setActivePersona(persona);
      setActiveProduct(product);
    }
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
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-up space-y-8">
        {/* Page header */}
        <div>
          <span className="text-warm-gray mb-2 block text-xs font-medium tracking-widest uppercase">
            Training
          </span>
          <h1 className="heading-serif text-charcoal mb-2 text-3xl md:text-4xl lg:text-5xl">
            Start a <em>Roleplay.</em>
          </h1>
          <p className="text-warm-gray max-w-xl text-base">
            Generate an AI buyer persona and jump into a live voice
            conversation. Practice objection handling, closing, and more.
          </p>
        </div>

        {/* Configure Section */}
        <Card className="border-border/60 overflow-hidden rounded-2xl bg-white shadow-sm">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-cream-dark flex size-12 items-center justify-center rounded-2xl">
                <Phone className="text-charcoal size-6" />
              </div>
              <div>
                <CardTitle className="text-charcoal text-lg font-semibold">
                  Configure Session
                </CardTitle>
                <CardDescription className="text-warm-gray text-sm">
                  Select who you want to pitch to, and what you are pitching.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 pt-4">
            {products.length === 0 || personas.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-warm-gray mb-6 text-sm">
                  You need at least one persona and one product to start a
                  session.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Button asChild variant="brand" className="px-6">
                    <Link href="/dashboard/products">Manage Products</Link>
                  </Button>
                  <Button asChild variant="brandOutline" className="px-6">
                    <Link href="/dashboard/personas">Manage Personas</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1 space-y-2">
                  <label className="text-charcoal text-xs font-medium tracking-wider uppercase opacity-60">
                    Buyer Persona
                  </label>
                  <select
                    value={selectedPersonaId || ""}
                    onChange={(e) =>
                      setSelectedPersonaId(e.target.value || null)
                    }
                    className="border-border/60 bg-cream text-charcoal focus:ring-charcoal/20 h-12 w-full rounded-xl border px-4 text-sm transition-all focus:ring-2 focus:outline-none"
                  >
                    <option value="">Select a persona…</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-charcoal text-xs font-medium tracking-wider uppercase opacity-60">
                    Product to Pitch
                  </label>
                  <select
                    value={selectedProductId || ""}
                    onChange={(e) =>
                      setSelectedProductId(e.target.value || null)
                    }
                    className="border-border/60 bg-cream text-charcoal focus:ring-charcoal/20 h-12 w-full rounded-xl border px-4 text-sm transition-all focus:ring-2 focus:outline-none"
                  >
                    <option value="">Select a product to pitch…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName} — {p.industry}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleStartRoleplay}
                    disabled={!selectedProductId || !selectedPersonaId}
                    variant="brand"
                    className="h-12 min-w-[180px] px-4"
                  >
                    <Phone className="mr-2 size-4" />
                    Start Roleplay
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GenerationBanner tasks={tasks} onDismiss={dismissTask} />
    </>
  );
}
