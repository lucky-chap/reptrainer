"use client";

import Link from "next/link";
import { ArrowRight, Star, Mic, Brain, Target, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";

export function HeroSection() {
  const { user } = useAuth();
  const sectionRef = useRef<HTMLElement>(null);
  const ctaHref = user ? "/dashboard" : "/auth/signin";

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.1 },
    );
    const els = sectionRef.current?.querySelectorAll(".reveal");
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-section pt-28 pb-16 md:pt-36 md:pb-24 lg:pt-44"
    >
      {/* Badge */}
      <div className="reveal mb-8 flex justify-center">
        <span className="bg-charcoal/5 text-warm-gray inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
          welcome to reptrainer
        </span>
      </div>

      {/* Main Heading */}
      <div className="reveal reveal-delay-1 mx-auto mb-8 max-w-4xl text-center">
        <h1 className="heading-serif text-charcoal text-4xl md:text-6xl lg:text-7xl xl:text-8xl">
          Built for <em>High-Stakes</em> Sales Conversations.
        </h1>
      </div>

      {/* Subtitle */}
      <div className="reveal reveal-delay-2 mx-auto mb-10 max-w-2xl text-center">
        <p className="text-warm-gray text-base leading-relaxed md:text-lg">
          Reptrainer simulates real buyer objections using Gemini Live, grounds
          evaluations in your actual product knowledge, and helps teams close
          with confidence.
        </p>
      </div>

      {/* CTAs */}
      <div className="reveal reveal-delay-3 mb-14 flex items-center justify-center gap-4">
        <Link
          href={ctaHref}
          className="bg-charcoal text-cream hover:bg-charcoal-light group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-all duration-200"
        >
          {user ? "Go to Dashboard" : "Get started now"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="#features"
          className="border-border text-charcoal hover:bg-charcoal/5 inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-medium transition-all duration-200"
        >
          Explore more
        </Link>
      </div>

      {/* Rating */}
      <div className="reveal reveal-delay-3 mb-16 flex items-center justify-center gap-2">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="fill-amber-glow text-amber-glow size-4" />
          ))}
        </div>
        <span className="text-warm-gray text-sm">
          Rated 4.97/5 from 500+ sessions
        </span>
      </div>

      {/* Bento Grid Preview */}
      <div className="reveal reveal-delay-4 mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        {/* Main card */}
        <div className="border-border/60 relative overflow-hidden rounded-2xl border bg-white p-8 md:col-span-2">
          <div className="bg-emerald-glow/10 text-emerald-glow absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-medium">
            Live Session
          </div>
          <h3 className="text-warm-gray mb-2 text-sm font-medium">
            Performance Summary
          </h3>
          <p className="heading-serif text-charcoal mb-6 text-3xl md:text-4xl">
            87<span className="text-warm-gray text-lg">/100</span>
          </p>

          {/* Mini bar chart */}
          <div className="mt-4 flex h-20 items-end gap-2">
            {[65, 72, 58, 85, 92, 78, 87].map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md transition-all duration-500"
                style={{
                  height: `${val}%`,
                  background:
                    i === 6
                      ? "var(--color-charcoal)"
                      : "var(--color-cream-dark)",
                }}
              />
            ))}
          </div>
          <div className="text-warm-gray mt-2 flex justify-between text-[10px]">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span className="text-charcoal font-medium">Today</span>
          </div>
        </div>

        {/* Side cards */}
        <div className="flex flex-col gap-4">
          {/* Scrolling tags */}
          <div className="border-border/60 flex-1 overflow-hidden rounded-2xl border bg-white p-6">
            <h3 className="text-warm-gray mb-4 text-sm font-medium">
              Training Focus
            </h3>
            <div className="space-y-2">
              {[
                { icon: Mic, label: "Voice Roleplay", color: "text-blue-glow" },
                {
                  icon: Brain,
                  label: "Knowledge Base RAG",
                  color: "text-violet-glow",
                },
                {
                  icon: Target,
                  label: "Data-Driven Scoring",
                  color: "text-emerald-glow",
                },
                {
                  icon: TrendingUp,
                  label: "Multimodal Debriefs",
                  color: "text-amber-glow",
                },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="bg-cream/60 flex items-center gap-2.5 rounded-lg px-3 py-2"
                >
                  <Icon className={`size-4 ${color}`} />
                  <span className="text-charcoal text-xs font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini message */}
          <div className="border-border/60 rounded-2xl border bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="bg-violet-glow/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                <span className="text-violet-glow text-xs font-bold">AI</span>
              </div>
              <div>
                <p className="text-charcoal text-xs font-medium">
                  AI Coach&nbsp;
                  <span className="text-warm-gray font-normal">12:13pm</span>
                </p>
                <p className="text-emerald-glow mt-1 text-xs leading-relaxed font-medium">
                  💡 INSIGHT: Great pivot on that pricing objection. Try leading
                  with value next time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social proof band */}
      <div className="reveal mt-16 flex flex-col items-center gap-4">
        <p className="text-warm-gray text-sm">
          Join over <span className="text-charcoal font-medium">500</span> sales
          teams already training with Reptrainer.
        </p>
        <Link
          href="#testimonials"
          className="text-charcoal decoration-border hover:decoration-charcoal text-sm font-medium underline underline-offset-4 transition-colors"
        >
          See customer stories
        </Link>
      </div>
    </section>
  );
}
