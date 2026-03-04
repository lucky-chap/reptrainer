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
import type { Product } from "@/lib/db";
import { saveProduct, getAllProducts, deleteProduct } from "@/lib/db";
import { useAuth } from "@/context/auth-context";

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

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
    if (user) {
      loadProducts();
    }
  }, [user, loadProducts]);

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
        <div className="size-8 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-2 block">
            Configuration
          </span>
          <h1 className="heading-serif text-3xl md:text-4xl lg:text-5xl text-charcoal">
            Your <em>Products.</em>
          </h1>
          <p className="text-warm-gray mt-2 text-base">
            Set up the products your reps will sell during roleplay sessions.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
            showForm
              ? "bg-cream-dark text-charcoal"
              : "bg-charcoal text-cream hover:bg-charcoal-light"
          }`}
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
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border/60 p-8 animate-fade-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal flex items-center gap-2">
                  <Building2 className="size-4 text-warm-gray" />
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  required
                  className="w-full h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal flex items-center gap-2">
                  <Target className="size-4 text-warm-gray" />
                  Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Enterprise SaaS"
                  required
                  className="w-full h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-charcoal flex items-center gap-2">
                <FileText className="size-4 text-warm-gray" />
                Product Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your product does, its key features, and value proposition..."
                rows={3}
                required
                className="w-full rounded-xl border border-border/60 bg-cream px-4 py-3 text-sm text-charcoal placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-charcoal flex items-center gap-2">
                <Target className="size-4 text-warm-gray" />
                Target Customer
              </label>
              <input
                type="text"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                placeholder="e.g., VP of Engineering at mid-market SaaS companies"
                required
                className="w-full h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-charcoal flex items-center gap-2">
                <AlertTriangle className="size-4 text-warm-gray" />
                Common Objections
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={objectionInput}
                  onChange={(e) => setObjectionInput(e.target.value)}
                  placeholder="Add an objection..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddObjection();
                    }
                  }}
                  className="flex-1 h-12 rounded-xl border border-border/60 bg-cream px-4 text-sm text-charcoal placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:ring-charcoal/20 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddObjection}
                  className="size-12 rounded-xl bg-cream-dark flex items-center justify-center hover:bg-charcoal hover:text-cream transition-colors"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              {objections.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {objections.map((obj, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-cream-dark text-charcoal"
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

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors"
            >
              Save Product
            </button>
          </form>
        </div>
      )}

      {/* Product list */}
      {products.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-border/60 p-12 flex flex-col items-center justify-center text-center">
          <div className="size-16 rounded-2xl bg-cream-dark flex items-center justify-center mb-4">
            <Package className="size-8 text-warm-gray" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-1">
            No products yet
          </h3>
          <p className="text-sm text-warm-gray max-w-sm">
            Add your first product to start generating buyer personas and
            running roleplay sessions.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product, i) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-border/60 p-6 hover:shadow-lg hover:shadow-charcoal/5 transition-all duration-300 group animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-xl bg-cream-dark flex items-center justify-center shrink-0 group-hover:bg-charcoal transition-colors duration-300">
                      <Building2 className="size-5 text-charcoal group-hover:text-cream transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-charcoal">
                        {product.companyName}
                      </h3>
                      <p className="text-xs text-warm-gray">
                        {product.industry}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-warm-gray line-clamp-2 ml-[52px]">
                    {product.description}
                  </p>
                  {product.objections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 ml-[52px]">
                      {product.objections.slice(0, 3).map((obj, j) => (
                        <span
                          key={j}
                          className="px-2.5 py-0.5 rounded-full text-[11px] bg-cream-dark text-warm-gray"
                        >
                          {obj}
                        </span>
                      ))}
                      {product.objections.length > 3 && (
                        <span className="px-2 py-0.5 text-[11px] text-warm-gray">
                          +{product.objections.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="text-warm-gray-light hover:text-rose-glow opacity-0 group-hover:opacity-100 transition-all p-2"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
