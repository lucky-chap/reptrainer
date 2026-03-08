"use client";

import { useState, useEffect, useMemo } from "react";
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
  Target,
  Users,
} from "lucide-react";
import type { Product, Persona } from "@/lib/db";
import {
  subscribeProducts,
  subscribePersonas,
  deletePersona,
  savePersona,
  getUserTeams,
} from "@/lib/db";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { useBackgroundGeneration } from "@/hooks/use-background-generation";
import { PersonaCard } from "@/components/persona-card";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { PROSPECT_PERSONALITY_TEMPLATES } from "@reptrainer/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<string | null>(null);
  const {
    isAdmin,
    activeMembership,
    memberships,
    loading: teamLoading,
  } = useTeam();
  const teamIds = useMemo(() => memberships.map((m) => m.id), [memberships]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Manual Form State
  const [manualName, setManualName] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualStrategy, setManualStrategy] = useState("");
  const [manualIntensity, setManualIntensity] = useState(1);
  const [manualProductId, setManualProductId] = useState("");
  const [manualGender, setManualGender] = useState<"male" | "female" | "other">(
    "female",
  );

  // AI Generation State
  const [selectedGender, setSelectedGender] = useState<
    "male" | "female" | "other"
  >("other");
  const [competitorUrl, setCompetitorUrl] = useState("");

  const { tasks, isGenerating, generatePersona, dismissTask } =
    useBackgroundGeneration();

  useEffect(() => {
    if (!user || teamLoading) return;

    if (!isAdmin) {
      window.location.href = "/dashboard";
      return;
    }

    const handleError = (err: Error) => {
      console.error("Personas page subscription error:", err);
      setLoading(false);
    };

    if (activeMembership && !selectedTeamId) {
      setSelectedTeamId(activeMembership.id);
    } else if (memberships.length > 0 && !selectedTeamId) {
      setSelectedTeamId(memberships[0].id);
    }

    const unsubProducts = subscribeProducts(
      user.uid,
      teamIds,
      (data) => setProducts(data),
      handleError,
    );

    const unsubPersonas = subscribePersonas(
      user.uid,
      teamIds,
      (data) => setPersonas(data),
      handleError,
    );

    const timer = setTimeout(() => setLoading(false), 100);

    return () => {
      clearTimeout(timer);
      unsubProducts();
      unsubPersonas();
    };
  }, [user, teamIds, teamLoading, isAdmin, memberships]);

  const handleGenerate = () => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (product) {
      generatePersona(
        product,
        selectedPersonality || undefined,
        selectedGender,
        competitorUrl || undefined,
      );
    }
  };

  const handleDelete = (id: string) => {
    setPersonaToDelete(id);
  };

  const confirmDelete = async () => {
    if (personaToDelete) {
      await deletePersona(personaToDelete);
      setPersonaToDelete(null);
    }
  };

  // Removed handleMoveToTeam as personas are now team-centric by default

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProductId) return;

    const persona: Persona = {
      id: uuidv4(),
      userId: user?.uid || "anonymous",
      teamId: selectedTeamId || "personal",
      productId: manualProductId,
      name: manualName,
      role: manualRole,
      personalityPrompt: `You are ${manualName}, a ${manualRole}. Your strategy is ${manualStrategy}.`,
      intensityLevel: manualIntensity,
      objectionStrategy: manualStrategy,
      gender: manualGender,
      traits: {
        aggressiveness: manualIntensity * 3,
        interruptionFrequency: "low",
        objectionStyle: "analytical",
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
        <Loader2 className="text-charcoal size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-warm-gray mb-2 block text-[10px] font-bold tracking-[0.15em] uppercase">
            Team Assets
          </span>
          <h1 className="heading-serif text-charcoal text-3xl md:text-5xl">
            Team <em>Personas.</em>
          </h1>
          <p className="text-warm-gray/70 mt-2 text-sm font-medium md:text-base">
            Generate AI-powered buyer personas for realistic sales roleplay.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreator(!showCreator);
            if (showForm) setShowForm(false);
          }}
          variant={showCreator ? "brandOutline" : "brand"}
          className="h-12 px-6"
        >
          {showCreator ? (
            <>
              <X className="mr-2 size-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 size-4" />
              Create Persona
            </>
          )}
        </Button>
      </div>

      {/* Generation Options */}
      {showCreator && (
        <div className="animate-fade-down grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left: AI Generator */}
          <Card className="border-border/60 group flex h-full flex-col overflow-hidden shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-cream-dark group-hover:bg-charcoal group-hover:text-cream flex size-10 items-center justify-center rounded-xl transition-colors duration-300">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Generate with AI
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Analysis driven profile generation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {products.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-warm-gray mb-6 text-sm font-medium">
                    Add a product first to generate personas.
                  </p>
                  <Button asChild variant="brandOutline" className="h-12">
                    <Link href="/dashboard/products">Add a product</Link>
                  </Button>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <p className="text-warm-gray/80 text-sm leading-relaxed font-medium">
                    Select a product and our AI will generate a realistic target
                    buyer profile based on its features and industry.
                  </p>
                  <Select
                    value={selectedProductId || ""}
                    onValueChange={(val) => setSelectedProductId(val)}
                  >
                    <SelectTrigger className="h-12 w-full rounded-xl">
                      <SelectValue placeholder="Select a product…" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl">
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.companyName} — {p.industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="pt-2">
                    <Label className="text-warm-gray/80 mb-2 block text-[10px] font-bold tracking-widest uppercase">
                      Personality Type (Optional)
                    </Label>
                    <Select
                      value={selectedPersonality || "custom"}
                      onValueChange={(val) =>
                        setSelectedPersonality(val === "custom" ? null : val)
                      }
                    >
                      <SelectTrigger className="h-12 w-full rounded-xl">
                        <SelectValue placeholder="AI Default" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="max-h-60 rounded-xl"
                      >
                        <SelectItem value="custom">
                          AI Default (Balanced)
                        </SelectItem>
                        {PROSPECT_PERSONALITY_TEMPLATES.map((t) => (
                          <SelectItem key={t.type} value={t.type}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2">
                    <Label className="text-warm-gray/80 mb-2 block text-[10px] font-bold tracking-widest uppercase">
                      Preferred Gender
                    </Label>
                    <Select
                      value={selectedGender}
                      onValueChange={(val: "male" | "female" | "other") =>
                        setSelectedGender(val)
                      }
                    >
                      <SelectTrigger className="h-12 w-full rounded-xl">
                        <SelectValue placeholder="AI Selects" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="rounded-xl">
                        <SelectItem value="other">
                          AI Selects (Mixed)
                        </SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="pt-2">
                      <Label className="text-warm-gray/80 mb-2 block text-[10px] font-bold tracking-widest uppercase">
                        Current Competitor Website (Optional)
                      </Label>
                      <Input
                        value={competitorUrl}
                        onChange={(e) => setCompetitorUrl(e.target.value)}
                        placeholder="e.g., https://competitor.com"
                        className="h-12 rounded-xl"
                      />
                      <p className="text-warm-gray/50 mt-1 text-[10px] font-medium">
                        AI will research this competitor to create a more
                        realistic buyer.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGenerate}
                disabled={!selectedProductId || isGenerating}
                className="h-12 w-full rounded-full"
                variant={"brand"}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    AI Generate
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Right: Custom Generator */}
          <Card className="border-border/60 group flex h-full flex-col shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-cream-dark group-hover:bg-charcoal group-hover:text-cream flex size-10 items-center justify-center rounded-xl transition-colors duration-300">
                  <Plus className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Custom Persona
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Manually define buyer traits
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-warm-gray/80 mb-6 text-sm leading-relaxed font-medium">
                Want a specific challenge? Create a persona from scratch by
                defining their role, attitude, and objection style.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setShowForm(!showForm)}
                variant={"brandOutline"}
                className="h-12 w-full rounded-full"
              >
                {showForm ? (
                  <>
                    <X className="mr-2 size-4" />
                    Cancel Manual Entry
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 size-4" />
                    Create Manually
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Manual Form */}
      {showForm && (
        <Card className="border-border/60 animate-fade-up shadow-none">
          <CardContent className="p-8">
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="manualName"
                    className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="manualName"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g., Sarah Johnson"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="manualRole"
                    className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                  >
                    Job Role
                  </Label>
                  <Input
                    id="manualRole"
                    value={manualRole}
                    onChange={(e) => setManualRole(e.target.value)}
                    placeholder="e.g., VP of Sales"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="manualGender"
                    className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                  >
                    Gender
                  </Label>
                  <Select
                    value={manualGender}
                    onValueChange={(val: "male" | "female" | "other") =>
                      setManualGender(val)
                    }
                  >
                    <SelectTrigger
                      id="manualGender"
                      className="h-12 rounded-xl"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other / Randomized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="manualProductId"
                  className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                >
                  Associated Product
                </Label>
                <Select
                  value={manualProductId}
                  onValueChange={(val) => setManualProductId(val)}
                >
                  <SelectTrigger
                    id="manualProductId"
                    className="h-12 w-full rounded-xl"
                  >
                    <SelectValue placeholder="Link to a product…" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="rounded-xl">
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="manualStrategy"
                  className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                >
                  Objection Strategy
                </Label>
                <Textarea
                  id="manualStrategy"
                  value={manualStrategy}
                  onChange={(e) => setManualStrategy(e.target.value)}
                  placeholder="How does this persona handle objections? (e.g., Focuses on ROI, very skeptical of new tech...)"
                  rows={4}
                  required
                  className="min-h-[120px] rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
                  Intensity Level
                </Label>
                <div className="flex gap-3">
                  {[1, 2, 3].map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={
                        manualIntensity === level ? "default" : "outline"
                      }
                      onClick={() => setManualIntensity(level)}
                      className="h-12 flex-1 rounded-xl"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
                <p className="text-warm-gray/60 mt-2 text-center text-[10px] font-bold tracking-widest uppercase">
                  {intensityLabels[manualIntensity - 1]}
                </p>
              </div>

              <Button
                type="submit"
                variant="brand"
                disabled={!manualProductId}
                className="h-12 w-full rounded-xl text-sm font-bold tracking-widest uppercase"
              >
                Save Persona
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Persona List */}
      {personas.length === 0 && !showForm ? (
        <Card className="border-border/60 flex flex-col items-center justify-center py-16 text-center shadow-none">
          <div className="bg-cream-dark mb-6 flex size-16 items-center justify-center rounded-2xl">
            <UserCircle className="text-warm-gray size-8" />
          </div>
          <CardTitle className="text-charcoal mb-2 text-xl font-bold">
            No personas yet
          </CardTitle>
          <CardDescription className="max-w-sm text-sm font-medium">
            Generate your first buyer persona to start roleplay sessions.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona, i) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              product={products.find((p) => p.id === persona.productId)}
              index={i}
              onDelete={handleDelete}
              // Removed team-specific props as everything is team-centric now
            />
          ))}
        </div>
      )}

      {/* Deletion Confirmation */}
      <AlertDialog
        open={!!personaToDelete}
        onOpenChange={(open) => !open && setPersonaToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl border-none p-8 sm:max-w-[400px]">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-50">
              <Trash2 className="size-8 text-rose-600" />
            </div>
            <div className="space-y-2 text-center">
              <AlertDialogTitle className="heading-serif text-charcoal text-2xl">
                Delete <em>Persona?</em>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-warm-gray/70 text-sm leading-relaxed font-medium">
                This will permanently remove the persona and any associated
                conversations. This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AlertDialogCancel asChild>
              <Button
                variant="brandOutline"
                className="h-12 w-full rounded-xl sm:flex-1"
              >
                No, Keep it
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={confirmDelete}
                className="h-12 w-full rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-200 hover:bg-rose-700 sm:flex-1"
              >
                Yes, Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
