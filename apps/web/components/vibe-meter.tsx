"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, Activity, AlertCircle, Target, TrendingUp } from "lucide-react";
import { PersonaMood } from "@/hooks/gemini-types";

interface VibeMeterProps {
  mood?: PersonaMood;
}

export function VibeMeter({ mood }: VibeMeterProps) {
  const trust = mood?.trust ?? 50;
  const interest = mood?.interest ?? 50;
  const frustration = mood?.frustration ?? 0;
  const dealLikelihood = mood?.dealLikelihood ?? 0.1;

  const metrics = [
    {
      label: "Trust",
      value: trust,
      icon: Heart,
      color: "bg-emerald-500",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Interest",
      value: interest,
      icon: Activity,
      color: "bg-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Frustration",
      value: frustration,
      icon: AlertCircle,
      color: "bg-rose-500",
      bg: "bg-rose-50",
      border: "border-rose-100",
    },
  ];

  return (
    <div className="border-border/40 flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-charcoal flex items-center gap-2 text-sm font-bold">
          <TrendingUp className="text-warm-gray size-4" />
          Persona Vibe
        </h3>
        <AnimatePresence mode="wait">
          <motion.div
            key={dealLikelihood}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1"
          >
            <Target className="size-3 text-amber-600" />
            <span className="text-[10px] font-bold tracking-tight text-amber-700 uppercase">
              {Math.min(Math.round(dealLikelihood), 100)}% Deal Likelihood
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <m.icon className="text-warm-gray size-3" />
                <span className="text-charcoal text-[11px] font-medium">
                  {m.label}
                </span>
              </div>
              <span className="text-warm-gray font-mono text-[10px]">
                {m.value}%
              </span>
            </div>
            <div
              className={`h-1.5 w-full rounded-full ${m.bg} overflow-hidden border ${m.border}`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${m.value}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${m.color} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-warm-gray mt-1 text-[10px] leading-tight italic">
        Real-time emotional tracking powered by Gemini Live.
      </p>
    </div>
  );
}
