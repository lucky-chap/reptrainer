"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { Product } from "@/lib/db";
import { saveProduct, getAllProducts, deleteProduct } from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";

interface ProductSetupProps {
  onProductSelect?: (product: Product) => void;
}

export function ProductSetup({ onProductSelect }: ProductSetupProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { activeMembership } = useTeam();

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [industry, setIndustry] = useState("");
  const [objectionInput, setObjectionInput] = useState("");
  const [objections, setObjections] = useState<string[]>([]);

  const loadProducts = useCallback(async () => {
    if (!user) return;
    const prods = await getAllProducts(user.uid);
    setProducts(prods);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
      teamId: activeMembership?.id || "personal",
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
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    loadProducts();
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground mt-1">
            Set up the products your reps will sell during roleplay sessions.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
          variant={showForm ? "secondary" : "default"}
        >
          {showForm ? (
            <>
              <X className="size-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Add Product
            </>
          )}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="glass animate-fade-up p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="text-emerald-glow size-4" />
                  Company Name
                </label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Target className="text-blue-glow size-4" />
                  Industry
                </label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Enterprise SaaS"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="text-amber-glow size-4" />
                Product Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your product does, its key features, and value proposition..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Target className="text-violet-glow size-4" />
                Target Customer
              </label>
              <Input
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                placeholder="e.g., VP of Engineering at mid-market SaaS companies"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="text-rose-glow size-4" />
                Common Objections
              </label>
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
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddObjection}
                  size="sm"
                  className="shrink-0"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {objections.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {objections.map((obj, i) => (
                    <span
                      key={i}
                      className="bg-rose-glow/10 text-rose-glow border-rose-glow/20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                    >
                      {obj}
                      <button
                        type="button"
                        onClick={() => handleRemoveObjection(i)}
                        className="transition-colors hover:text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">
              Save Product
            </Button>
          </form>
        </Card>
      )}

      {/* Product List */}
      {products.length === 0 && !showForm ? (
        <Card className="glass flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-emerald-glow/10 mb-4 flex size-16 items-center justify-center rounded-2xl">
            <Package className="text-emerald-glow/60 size-8" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No products yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Add your first product to start generating buyer personas and
            running roleplay sessions.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product, i) => (
            <Card
              key={product.id}
              className="glass hover:border-emerald-glow/20 group cursor-pointer p-5 transition-all duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => onProductSelect?.(product)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="from-emerald-glow/15 to-emerald-glow/5 border-emerald-glow/15 flex size-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br">
                      <Building2 className="text-emerald-glow size-5" />
                    </div>
                    <div>
                      <h3 className="group-hover:text-emerald-glow text-base font-semibold transition-colors">
                        {product.companyName}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {product.industry}
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground ml-[52px] line-clamp-2 text-sm">
                    {product.description}
                  </p>
                  {product.objections.length > 0 && (
                    <div className="mt-3 ml-[52px] flex flex-wrap gap-1.5">
                      {product.objections.slice(0, 3).map((obj, j) => (
                        <span
                          key={j}
                          className="bg-secondary text-muted-foreground rounded-md px-2 py-0.5 text-[11px]"
                        >
                          {obj}
                        </span>
                      ))}
                      {product.objections.length > 3 && (
                        <span className="text-muted-foreground rounded-md px-2 py-0.5 text-[11px]">
                          +{product.objections.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive opacity-0 transition-all group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(product.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
