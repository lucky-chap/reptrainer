"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import {
  Package,
  Plus,
  Trash2,
  X,
  Building2,
  FileText,
  Target,
  AlertTriangle,
  Sparkles,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { Product } from "@/lib/db";
import { saveProduct, subscribeProducts, deleteProduct } from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { useBackgroundGeneration } from "@/hooks/use-background-generation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [industry, setIndustry] = useState("");
  const [objectionInput, setObjectionInput] = useState("");
  const [objections, setObjections] = useState<string[]>([]);

  const { tasks, isGenerating, generateProduct, dismissTask } =
    useBackgroundGeneration();

  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => setLoading(false), 100);

    const unsub = subscribeProducts(
      user.uid,
      (data) => setProducts(data),
      (err) => {
        console.error("Products subscription error:", err);
        setLoading(false);
      },
    );

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [user]);

  const handleAddObjection = () => {
    if (objectionInput.trim()) {
      setObjections((prev) => [...prev, objectionInput.trim()]);
      setObjectionInput("");
    }
  };

  const handleRemoveObjection = (index: number) => {
    setObjections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product: Product = {
      id: uuidv4(),
      userId: user?.uid || "anonymous",
      companyName,
      description,
      targetCustomer,
      industry,
      objections,
      createdAt: new Date().toISOString(),
    };
    await saveProduct(product);
    setCompanyName("");
    setDescription("");
    setTargetCustomer("");
    setIndustry("");
    setObjections([]);
    setShowForm(false);
    setShowCreator(false);
  };

  const handleAiGenerate = async () => {
    await generateProduct({});
    setShowCreator(false);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
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
            Configuration
          </span>
          <h1 className="heading-serif text-charcoal text-3xl md:text-5xl">
            Your <em>Products.</em>
          </h1>
          <p className="text-warm-gray/70 mt-2 text-sm font-medium md:text-base">
            Set up the products your reps will sell during roleplay sessions.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreator(!showCreator);
            if (showForm) setShowForm(false);
          }}
          variant={showCreator ? "brandOutline" : "brand"}
          className="px-6"
        >
          {showCreator ? (
            <>
              <X className="mr-2 size-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 size-4" />
              Create Product
            </>
          )}
        </Button>
      </div>

      {/* Generation Options */}
      {showCreator && (
        <div className="animate-fade-down grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left: AI Generator */}
          <Card className="border-border/60 group overflow-hidden shadow-none">
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
                    Fully automated product profiling
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-warm-gray/80 mb-6 text-sm leading-relaxed font-medium">
                Let our AI create a realistic product profile for you instantly.
                It will analyze common sales patterns to build a robust
                template.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleAiGenerate}
                disabled={isGenerating}
                variant="brand"
                className="w-full rounded-xl"
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
          <Card className="border-border/60 group shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-cream-dark group-hover:bg-charcoal group-hover:text-cream flex size-10 items-center justify-center rounded-xl transition-colors duration-300">
                  <Plus className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Custom Generate
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Manually enter product details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-warm-gray/80 mb-6 text-sm leading-relaxed font-medium">
                Define your own product details, industry, target audience, and
                specific objections you want your team to handle.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setShowForm(!showForm)}
                variant={showForm ? "brandOutline" : "brandOutline"}
                className="w-full rounded-xl"
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

      {/* Form */}
      {showForm && (
        <Card className="border-border/60 animate-fade-up shadow-none">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="companyName"
                    className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                  >
                    <Building2 className="size-3.5" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="industry"
                    className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                  >
                    <Target className="size-3.5" />
                    Industry
                  </Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Enterprise SaaS"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                >
                  <FileText className="size-3.5" />
                  Product Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what your product does, its key features, and value proposition..."
                  rows={4}
                  required
                  className="min-h-[120px] rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="targetCustomer"
                  className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
                >
                  <Target className="size-3.5" />
                  Target Customer
                </Label>
                <Input
                  id="targetCustomer"
                  value={targetCustomer}
                  onChange={(e) => setTargetCustomer(e.target.value)}
                  placeholder="e.g., VP of Engineering at mid-market SaaS companies"
                  required
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-warm-gray/80 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
                  <AlertTriangle className="size-3.5" />
                  Common Objections
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={objectionInput}
                    onChange={(e) => setObjectionInput(e.target.value)}
                    placeholder="Add an objection..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddObjection();
                      }
                    }}
                    className="h-12 flex-1 rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={handleAddObjection}
                    variant="secondary"
                    className="h-12 w-12 rounded-xl p-0"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                {objections.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {objections.map((obj, i) => (
                      <span
                        key={i}
                        className="bg-cream-dark text-charcoal inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase"
                      >
                        {obj}
                        <button
                          type="button"
                          onClick={() => handleRemoveObjection(i)}
                          className="hover:text-rose-glow transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="brand"
                className="h-12 w-full rounded-xl text-sm font-bold tracking-widest uppercase"
              >
                Save Product
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Product list */}
      {products.length === 0 && !showForm ? (
        <Card className="border-border/60 flex flex-col items-center justify-center py-16 text-center shadow-none">
          <div className="bg-cream-dark mb-6 flex size-16 items-center justify-center rounded-2xl">
            <Package className="text-warm-gray size-8" />
          </div>
          <CardTitle className="text-charcoal mb-2 text-xl font-bold">
            No products yet
          </CardTitle>
          <CardDescription className="max-w-sm text-sm font-medium">
            Add your first product to start generating buyer personas and
            running roleplay sessions.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}

      {/* Product Detail Dialog */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={() => setSelectedProduct(null)}
      >
        <DialogContent className="w-full max-w-4xl overflow-hidden rounded-[2.5rem] border-none bg-white p-0 shadow-2xl">
          {selectedProduct && (
            <>
              <DialogHeader className="border-border/40 bg-cream/5 flex flex-row items-center justify-between border-b p-10 pb-8">
                <div className="flex items-center gap-6">
                  <div className="bg-cream-dark flex size-16 shrink-0 rotate-3 items-center justify-center rounded-2xl shadow-inner transition-transform duration-500 hover:rotate-0">
                    <Building2 className="text-charcoal size-8" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="text-charcoal heading-serif text-3xl font-bold">
                      {selectedProduct.companyName}
                    </DialogTitle>
                    <DialogDescription className="text-warm-gray/60 mt-1.5 text-xs font-bold tracking-[0.2em] uppercase">
                      {selectedProduct.industry}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="custom-scrollbar max-h-[65vh] overflow-y-auto px-10 py-12">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
                  <div className="space-y-12 lg:col-span-3">
                    <section>
                      <h3 className="text-warm-gray/50 mb-4 text-[11px] font-bold tracking-[0.2em] uppercase">
                        Product Description
                      </h3>
                      <p className="text-charcoal text-lg leading-relaxed font-medium">
                        {selectedProduct.description}
                      </p>
                    </section>

                    <section>
                      <h3 className="text-warm-gray/50 mb-4 text-[11px] font-bold tracking-[0.2em] uppercase">
                        Target Customer Segment
                      </h3>
                      <div className="bg-cream/20 border-border/20 hover:bg-cream/40 flex items-start gap-5 rounded-2xl border p-6 transition-all duration-300">
                        <div className="bg-charcoal text-cream flex size-10 shrink-0 items-center justify-center rounded-xl shadow-lg">
                          <Target className="size-5" />
                        </div>
                        <div>
                          <p className="text-charcoal pt-0.5 text-base leading-snug font-bold">
                            {selectedProduct.targetCustomer}
                          </p>
                          <p className="text-warm-gray/50 mt-1.5 text-[9px] font-bold tracking-widest uppercase">
                            Primary Decision Maker Influence
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-12 lg:col-span-2">
                    <section>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-warm-gray/50 text-[11px] font-bold tracking-[0.2em] uppercase">
                          Objection Library
                        </h3>
                        <span className="bg-cream-dark text-charcoal rounded-full px-2.5 py-0.5 text-[9px] font-bold">
                          {selectedProduct.objections.length} TOTAL
                        </span>
                      </div>
                      <div className="space-y-3">
                        {selectedProduct.objections.map((obj, i) => (
                          <div
                            key={i}
                            className="bg-cream/10 border-border/10 hover:border-border/30 group/item flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 hover:bg-white hover:shadow-sm"
                          >
                            <div className="bg-charcoal/30 group-hover/item:bg-charcoal mt-1.5 size-1.5 shrink-0 rounded-full transition-colors" />
                            <p className="text-charcoal text-sm leading-relaxed font-semibold">
                              {obj}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-border/40 bg-cream/5 flex items-center justify-between border-t px-10 py-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleDelete(selectedProduct.id);
                    setSelectedProduct(null);
                  }}
                  className="text-warm-gray/50 rounded-full px-6 transition-all hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="mr-2 size-4" />
                  Remove Record
                </Button>
                <div className="flex gap-4">
                  <Button
                    onClick={() => setSelectedProduct(null)}
                    variant="brandOutline"
                    className="px-8"
                  >
                    Close
                  </Button>
                  <Button
                    asChild
                    variant="brand"
                    className="shadow-charcoal/20 px-8 shadow-xl"
                  >
                    <Link
                      href={`/dashboard/train?productId=${selectedProduct.id}`}
                    >
                      Start Training
                    </Link>
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
