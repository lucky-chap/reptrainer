"use client";

import { useEffect, useRef } from "react";
import { Mic, Brain, BarChart3, Users, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Mic,
    title: "Live Voice Roleplay",
    description:
      "Practice live sales calls with AI-generated buyer personas using real-time, interruptible voice interaction powered by Gemini Live.",
    className:
      "md:col-span-2 md:row-span-2 bg-charcoal text-cream border-white/10",
    visual: <HUDVisual />,
  },
  {
    icon: Brain,
    title: "Grounded RAG Evaluation",
    description:
      "Upload your product docs and PDFs. Reptrainer fact-checks your pitch accuracy against your specific knowledge base.",
    className: "md:col-span-2 bg-cream-dark/30",
    visual: <DebriefVisual />,
  },
  {
    icon: BarChart3,
    title: "Multimodal Debriefs",
    description:
      "Get a 4-slide infographic presentation and audio narration after every call, complete with 'Before & After' correction examples.",
    className: "md:col-span-1",
  },
  {
    icon: Users,
    title: "Live Competitor Context",
    description:
      "Personas dynamically generate objections based on real-time competitor data fetched during the call.",
    className: "md:col-span-1",
  },
  {
    icon: Sparkles,
    title: "Whisper Coach HUD",
    description:
      "Get silent, real-time insights during the live roleplay to help you navigate tricky objections as they happen.",
    className: "md:col-span-2",
  },
  {
    icon: Shield,
    title: "Team Streaks & Leaderboards",
    description:
      "Drive adoption with team-wide practice streaks and competitive scoring analytics.",
    className: "md:col-span-2",
  },
];

function HUDVisual() {
  return (
    <div className="relative mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-emerald-glow size-2 animate-pulse rounded-full" />
        <span className="text-[10px] font-medium tracking-widest uppercase opacity-50">
          Live Coaching HUD
        </span>
      </div>
      <div className="space-y-3">
        <div className="h-2 w-3/4 rounded bg-white/10" />
        <div className="h-2 w-1/2 rounded bg-white/10" />
        <div className="bg-emerald-glow/10 border-emerald-glow/20 translate-y-2 transform rounded-lg border p-3 transition-transform duration-500 group-hover:translate-y-0">
          <p className="text-emerald-glow text-[10px] leading-relaxed font-medium">
            💡 INSIGHT: Great pivot on pricing! Try leading with the ROI case
            study next.
          </p>
        </div>
      </div>
    </div>
  );
}

function DebriefVisual() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 overflow-hidden px-1 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`border-charcoal/5 aspect-video transform rounded-lg border bg-white/40 p-2 shadow-sm transition-all duration-700 delay-${i * 100} group-hover:-translate-y-1 ${i === 3 ? "hidden sm:block" : ""}`}
        >
          <div className="bg-charcoal/10 mb-2 h-1 w-1/2 rounded" />
          <div className="bg-charcoal/5 relative h-full overflow-hidden rounded-md">
            <div className="from-charcoal/5 absolute inset-0 bg-linear-to-br to-transparent" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

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
      id="features"
      className="landing-section py-20 md:py-32"
    >
      {/* Section header */}
      <div className="mb-16 grid grid-cols-1 gap-6 md:mb-24 md:grid-cols-2 md:gap-16">
        <div className="reveal">
          <span className="text-warm-gray mb-4 block text-xs font-medium tracking-widest uppercase">
            Product Features
          </span>
          <h2 className="heading-serif text-charcoal text-3xl md:text-5xl lg:text-6xl">
            What you need, before you <em>know</em> you need it.
          </h2>
        </div>
        <div className="reveal reveal-delay-1 flex items-end">
          <p className="text-warm-gray max-w-lg text-base leading-relaxed md:text-lg">
            Reptrainer evolves with you, learning your patterns and pushing
            what&apos;s next into now. A system that grows as fast as your team
            does.
          </p>
        </div>
      </div>

      {/* Feature grid - Bento Style */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:grid-rows-3">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className={cn(
              `reveal reveal-delay-${Math.min(i + 1, 4)} group hover:shadow-charcoal/5 flex flex-col justify-between overflow-hidden rounded-3xl border p-8 transition-all duration-500 hover:shadow-2xl`,
              feature.className || "border-border/60 bg-white md:col-span-1",
            )}
          >
            <div>
              <div
                className={cn(
                  "mb-5 flex size-12 items-center justify-center rounded-2xl transition-all duration-300",
                  feature.className?.includes("bg-charcoal")
                    ? "text-cream group-hover:bg-cream group-hover:text-charcoal bg-white/10"
                    : "bg-cream-dark group-hover:bg-charcoal group-hover:text-cream",
                )}
              >
                <feature.icon className="size-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold tracking-tight">
                {feature.title}
              </h3>
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  feature.className?.includes("text-cream")
                    ? "text-cream/60"
                    : "text-warm-gray",
                )}
              >
                {feature.description}
              </p>
            </div>

            {"visual" in feature && feature.visual}
          </div>
        ))}
      </div>

      {/* Quote banner */}
      <div className="reveal border-border/60 mt-16 rounded-2xl border bg-white p-10 text-center md:mt-24 md:p-16">
        <blockquote className="heading-serif text-charcoal mx-auto mb-6 max-w-3xl text-xl md:text-2xl lg:text-3xl">
          &ldquo;We now rely on Reptrainer for all our sales readiness
          needs.&rdquo;
        </blockquote>
        <p className="text-warm-gray text-sm">
          — VP of Sales, Fortune 500 Enterprise
        </p>
      </div>
    </section>
  );
}
