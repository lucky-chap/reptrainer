"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, PhoneCall, MessageSquare, Lightbulb } from "lucide-react";

export function PerformanceSection() {
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
    <section ref={sectionRef} className="landing-section py-20 md:py-32">
      {/* Header */}
      <div className="reveal mb-16 md:mb-20">
        <span className="text-warm-gray mb-4 block text-xs font-medium tracking-widest uppercase">
          Performance & Clarity
        </span>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
          <h2 className="heading-serif text-charcoal text-3xl md:text-5xl lg:text-6xl">
            Intuitive <em>Performance.</em>
          </h2>
          <p className="text-warm-gray flex items-end text-base leading-relaxed md:text-lg">
            Whether you&apos;re growing fast or optimizing what&apos;s already
            built, Reptrainer keeps everything in sync. No clutter, no
            confusion—just intelligent clarity.
          </p>
        </div>
      </div>

      {/* Feature cards - large format */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1 - Live Roleplay */}
        <div className="reveal reveal-delay-1 border-border/60 flex flex-col rounded-2xl border bg-white p-8 md:p-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-blue-glow/10 flex size-10 items-center justify-center rounded-xl">
              <PhoneCall className="text-blue-glow size-5" />
            </div>
            <span className="text-warm-gray text-xs font-medium tracking-widest uppercase">
              Live Roleplay
            </span>
          </div>

          {/* Voice waves visualization */}
          <div className="bg-cream mb-6 flex-1 rounded-xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="bg-emerald-glow size-3 animate-pulse rounded-full" />
              <span className="text-charcoal text-xs font-medium">
                Session Active — 4:32
              </span>
            </div>
            <div className="flex h-16 items-center justify-center gap-1">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="bg-charcoal/20 w-1 rounded-full"
                  style={{
                    height: `${20 + Math.sin(i * 0.7) * 60}%`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <h3 className="text-charcoal mb-2 text-lg font-semibold">
            Voice-first experience
          </h3>
          <p className="text-warm-gray text-sm leading-relaxed">
            Speak naturally with AI buyers using real-time voice. No scripts, no
            delays — just authentic conversation practice.
          </p>
          <Link
            href="/dashboard/train"
            className="text-charcoal group mt-6 inline-flex items-center gap-1.5 text-sm font-medium"
          >
            Start a session
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Card 2 - AI Feedback */}
        <div className="reveal reveal-delay-2 border-border/60 flex flex-col rounded-2xl border bg-white p-8 md:p-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-violet-glow/10 flex size-10 items-center justify-center rounded-xl">
              <MessageSquare className="text-violet-glow size-5" />
            </div>
            <span className="text-warm-gray text-xs font-medium tracking-widest uppercase">
              AI Feedback
            </span>
          </div>

          {/* Feedback preview */}
          <div className="bg-cream mb-6 flex-1 space-y-4 rounded-xl p-6">
            {[
              {
                label: "Rapport Building",
                score: 92,
                color: "bg-emerald-glow",
              },
              {
                label: "Objection Handling",
                score: 78,
                color: "bg-amber-glow",
              },
              { label: "Product Knowledge", score: 95, color: "bg-blue-glow" },
              {
                label: "Closing Technique",
                score: 84,
                color: "bg-violet-glow",
              },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-charcoal font-medium">
                    {metric.label}
                  </span>
                  <span className="text-warm-gray">{metric.score}%</span>
                </div>
                <div className="bg-charcoal/10 h-1.5 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${metric.color} transition-all duration-1000`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-charcoal mb-2 text-lg font-semibold">
            Granular coaching insights
          </h3>
          <p className="text-warm-gray text-sm leading-relaxed">
            Every session produces detailed scores on your sales competencies.
            See exactly where you excel and where to improve.
          </p>
          <Link
            href="/dashboard/train"
            className="text-charcoal group mt-6 inline-flex items-center gap-1.5 text-sm font-medium"
          >
            View my report
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Full-width card */}
      <div className="reveal reveal-delay-3 bg-charcoal flex flex-col items-start gap-8 rounded-2xl p-8 md:flex-row md:items-center md:p-12 lg:p-16">
        <div className="flex-1">
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-cream/10 flex size-10 items-center justify-center rounded-xl">
              <Lightbulb className="text-amber-glow size-5" />
            </div>
            <span className="text-cream/40 text-xs font-medium tracking-widest uppercase">
              Adaptive Scenarios
            </span>
          </div>
          <h3 className="text-cream mb-3 text-xl font-semibold md:text-2xl">
            &ldquo;Switching to Reptrainer was easy.&rdquo;
          </h3>
          <p className="text-cream/50 max-w-lg text-sm leading-relaxed">
            The AI tailors each scenario to your skill level and product. As you
            improve, conversations get tougher — so you&apos;re always
            challenged. No two sessions are ever the same.
          </p>
        </div>
        <Link
          href="/dashboard/train"
          className="bg-cream text-charcoal hover:bg-cream-dark group inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors"
        >
          Continue reading
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
