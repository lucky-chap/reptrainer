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
      className="landing-section pt-28 md:pt-36 lg:pt-44 pb-16 md:pb-24"
    >
      {/* Badge */}
      <div className="reveal flex justify-center mb-8">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-charcoal/5 text-xs font-medium tracking-wide uppercase text-warm-gray">
          welcome to reptrainer
        </span>
      </div>

      {/* Main Heading */}
      <div className="reveal reveal-delay-1 text-center max-w-4xl mx-auto mb-8">
        <h1 className="heading-serif text-4xl md:text-6xl lg:text-7xl xl:text-8xl text-charcoal">
          Built for <em>High-Stakes</em> Sales Conversations.
        </h1>
      </div>

      {/* Subtitle */}
      <div className="reveal reveal-delay-2 text-center max-w-2xl mx-auto mb-10">
        <p className="text-base md:text-lg text-warm-gray leading-relaxed">
          Reptrainer simulates real buyer objections, coaches your responses in
          real-time, and helps your team close with confidence. Powered by
          Gemini AI.
        </p>
      </div>

      {/* CTAs */}
      <div className="reveal reveal-delay-3 flex items-center justify-center gap-4 mb-14">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-all duration-200 group"
        >
          {user ? "Go to Dashboard" : "Get started now"}
          <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          href="#features"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-border text-sm font-medium text-charcoal hover:bg-charcoal/5 transition-all duration-200"
        >
          Explore more
        </Link>
      </div>

      {/* Rating */}
      <div className="reveal reveal-delay-3 flex items-center justify-center gap-2 mb-16">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="size-4 fill-amber-glow text-amber-glow" />
          ))}
        </div>
        <span className="text-sm text-warm-gray">
          Rated 4.97/5 from 500+ sessions
        </span>
      </div>

      {/* Bento Grid Preview */}
      <div className="reveal reveal-delay-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {/* Main card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-border/60 p-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-glow/10 text-emerald-glow text-xs font-medium">
            Live Session
          </div>
          <h3 className="text-sm font-medium text-warm-gray mb-2">
            Performance Summary
          </h3>
          <p className="heading-serif text-3xl md:text-4xl text-charcoal mb-6">
            87<span className="text-lg text-warm-gray">/100</span>
          </p>

          {/* Mini bar chart */}
          <div className="flex items-end gap-2 h-20 mt-4">
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
          <div className="flex justify-between text-[10px] text-warm-gray mt-2">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span className="font-medium text-charcoal">Today</span>
          </div>
        </div>

        {/* Side cards */}
        <div className="flex flex-col gap-4">
          {/* Scrolling tags */}
          <div className="bg-white rounded-2xl border border-border/60 p-6 flex-1 overflow-hidden">
            <h3 className="text-sm font-medium text-warm-gray mb-4">
              Training Focus
            </h3>
            <div className="space-y-2">
              {[
                { icon: Mic, label: "Voice Roleplay", color: "text-blue-glow" },
                {
                  icon: Brain,
                  label: "Objection Handling",
                  color: "text-violet-glow",
                },
                {
                  icon: Target,
                  label: "Closing Technique",
                  color: "text-emerald-glow",
                },
                {
                  icon: TrendingUp,
                  label: "Performance",
                  color: "text-amber-glow",
                },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-cream/60"
                >
                  <Icon className={`size-4 ${color}`} />
                  <span className="text-xs font-medium text-charcoal">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini message */}
          <div className="bg-white rounded-2xl border border-border/60 p-6">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-violet-glow/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-violet-glow">AI</span>
              </div>
              <div>
                <p className="text-xs font-medium text-charcoal">
                  AI Coach&nbsp;
                  <span className="text-warm-gray font-normal">12:13pm</span>
                </p>
                <p className="text-xs text-warm-gray mt-1 leading-relaxed">
                  Great pivot on that pricing objection. Try leading with value
                  next time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social proof band */}
      <div className="reveal mt-16 flex flex-col items-center gap-4">
        <p className="text-sm text-warm-gray">
          Join over <span className="font-medium text-charcoal">500</span> sales
          teams already training with Reptrainer.
        </p>
        <Link
          href="#testimonials"
          className="text-sm font-medium text-charcoal underline decoration-border underline-offset-4 hover:decoration-charcoal transition-colors"
        >
          See customer stories
        </Link>
      </div>
    </section>
  );
}
