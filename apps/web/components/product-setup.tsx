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

interface ProductSetupProps {
  onProductSelect?: (product: Product) => void;
}

export function ProductSetup({ onProductSelect }: ProductSetupProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

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
        <div className="size-8 border-2 border-emerald-glow/30 border-t-emerald-glow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
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
        <Card className="p-6 glass animate-fade-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="size-4 text-emerald-glow" />
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
                <label className="text-sm font-medium flex items-center gap-2">
                  <Target className="size-4 text-blue-glow" />
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
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="size-4 text-amber-glow" />
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
              <label className="text-sm font-medium flex items-center gap-2">
                <Target className="size-4 text-violet-glow" />
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
              <label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-glow" />
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {objections.map((obj, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-glow/10 text-rose-glow border border-rose-glow/20"
                    >
                      {obj}
                      <button
                        type="button"
                        onClick={() => handleRemoveObjection(i)}
                        className="hover:text-white transition-colors"
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
        <Card className="p-12 flex flex-col items-center justify-center text-center glass">
          <div className="size-16 rounded-2xl bg-emerald-glow/10 flex items-center justify-center mb-4">
            <Package className="size-8 text-emerald-glow/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No products yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Add your first product to start generating buyer personas and
            running roleplay sessions.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product, i) => (
            <Card
              key={product.id}
              className="p-5 glass hover:border-emerald-glow/20 transition-all duration-300 cursor-pointer group"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => onProductSelect?.(product)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-glow/15 to-emerald-glow/5 border border-emerald-glow/15 flex items-center justify-center shrink-0">
                      <Building2 className="size-5 text-emerald-glow" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base group-hover:text-emerald-glow transition-colors">
                        {product.companyName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {product.industry}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 ml-[52px]">
                    {product.description}
                  </p>
                  {product.objections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 ml-[52px]">
                      {product.objections.slice(0, 3).map((obj, j) => (
                        <span
                          key={j}
                          className="px-2 py-0.5 rounded-md text-[11px] bg-secondary text-muted-foreground"
                        >
                          {obj}
                        </span>
                      ))}
                      {product.objections.length > 3 && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] text-muted-foreground">
                          +{product.objections.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
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
