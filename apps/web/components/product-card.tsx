"use client";

import { Building2, AlertTriangle, ArrowRight } from "lucide-react";
import type { Product } from "@/lib/db";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface ProductCardProps {
  product: Product;
  index: number;
  onClick: () => void;
}

export function ProductCard({ product, index, onClick }: ProductCardProps) {
  return (
    <Card
      onClick={onClick}
      className="border-border/60 hover:shadow-charcoal/5 group animate-fade-up flex cursor-pointer flex-col overflow-hidden shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <div className="bg-cream-dark group-hover:bg-charcoal group-hover:text-cream flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all duration-500 group-hover:rotate-3">
            <Building2 className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-charcoal group-hover:text-charcoal-light truncate text-lg leading-tight font-bold transition-colors">
              {product.companyName}
            </h3>
            <p className="text-warm-gray/60 truncate text-[10px] font-extrabold tracking-[0.2em] uppercase">
              {product.industry}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <p className="text-warm-gray line-clamp-3 text-sm leading-relaxed font-medium">
          {product.description}
        </p>
      </CardContent>
      <CardFooter className="bg-cream/30 border-border/40 group-hover:bg-cream/50 mt-auto flex flex-col items-start gap-4 border-t p-5 transition-colors">
        <div className="w-full">
          <span className="text-warm-gray/50 mb-3 block text-[9px] font-bold tracking-widest uppercase">
            Core Objections
          </span>
          {product.objections.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {product.objections.slice(0, 3).map((obj, j) => (
                <div
                  key={j}
                  className="border-border/20 text-charcoal flex items-center gap-1.5 rounded-lg border bg-white/80 px-2.5 py-1 text-[10px] font-bold shadow-sm"
                >
                  <AlertTriangle className="text-warm-gray/40 size-3" />
                  <span className="max-w-[120px] truncate">{obj}</span>
                </div>
              ))}
              {product.objections.length > 3 && (
                <span className="text-warm-gray/40 flex items-center px-1 text-[9px] font-bold tracking-wider uppercase">
                  +{product.objections.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-warm-gray/40 text-[10px] font-medium italic">
              No objections defined yet...
            </p>
          )}
        </div>

        <div className="flex w-full items-center justify-between pt-1">
          <div className="bg-warm-gray/10 mr-4 h-px flex-1" />
          <div className="text-charcoal/30 group-hover:text-charcoal flex items-center gap-2 transition-colors">
            <span className="text-[10px] font-bold tracking-widest uppercase">
              Details
            </span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
