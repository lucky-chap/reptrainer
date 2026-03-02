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
        <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-4 block">
          Performance & Clarity
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          <h2 className="heading-serif text-3xl md:text-5xl lg:text-6xl text-charcoal">
            Intuitive <em>Performance.</em>
          </h2>
          <p className="text-base md:text-lg text-warm-gray leading-relaxed flex items-end">
            Whether you&apos;re growing fast or optimizing what&apos;s already
            built, Reptrainer keeps everything in sync. No clutter, no
            confusion—just intelligent clarity.
          </p>
        </div>
      </div>

      {/* Feature cards - large format */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Card 1 - Live Roleplay */}
        <div className="reveal reveal-delay-1 bg-white rounded-2xl border border-border/60 p-8 md:p-10 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-blue-glow/10 flex items-center justify-center">
              <PhoneCall className="size-5 text-blue-glow" />
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-warm-gray">
              Live Roleplay
            </span>
          </div>

          {/* Voice waves visualization */}
          <div className="bg-cream rounded-xl p-6 mb-6 flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-3 rounded-full bg-emerald-glow animate-pulse" />
              <span className="text-xs font-medium text-charcoal">
                Session Active — 4:32
              </span>
            </div>
            <div className="flex items-center justify-center gap-1 h-16">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-charcoal/20"
                  style={{
                    height: `${20 + Math.sin(i * 0.7) * 60}%`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <h3 className="text-lg font-semibold text-charcoal mb-2">
            Voice-first experience
          </h3>
          <p className="text-sm text-warm-gray leading-relaxed">
            Speak naturally with AI buyers using real-time voice. No scripts, no
            delays — just authentic conversation practice.
          </p>
          <Link
            href="/dashboard/train"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal mt-6 group"
          >
            Start a session
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Card 2 - AI Feedback */}
        <div className="reveal reveal-delay-2 bg-white rounded-2xl border border-border/60 p-8 md:p-10 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-violet-glow/10 flex items-center justify-center">
              <MessageSquare className="size-5 text-violet-glow" />
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-warm-gray">
              AI Feedback
            </span>
          </div>

          {/* Feedback preview */}
          <div className="bg-cream rounded-xl p-6 mb-6 flex-1 space-y-4">
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
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-charcoal font-medium">
                    {metric.label}
                  </span>
                  <span className="text-warm-gray">{metric.score}%</span>
                </div>
                <div className="h-1.5 bg-charcoal/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${metric.color} transition-all duration-1000`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-charcoal mb-2">
            Granular coaching insights
          </h3>
          <p className="text-sm text-warm-gray leading-relaxed">
            Every session produces detailed scores on your sales competencies.
            See exactly where you excel and where to improve.
          </p>
          <Link
            href="/dashboard/train"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal mt-6 group"
          >
            View sample report
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Full-width card */}
      <div className="reveal reveal-delay-3 bg-charcoal rounded-2xl p-8 md:p-12 lg:p-16 flex flex-col md:flex-row items-start md:items-center gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-cream/10 flex items-center justify-center">
              <Lightbulb className="size-5 text-amber-glow" />
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-cream/40">
              Adaptive Scenarios
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-cream mb-3">
            &ldquo;Switching to Reptrainer was easy.&rdquo;
          </h3>
          <p className="text-sm text-cream/50 leading-relaxed max-w-lg">
            The AI tailors each scenario to your skill level and product. As you
            improve, conversations get tougher — so you&apos;re always
            challenged. No two sessions are ever the same.
          </p>
        </div>
        <Link
          href="/dashboard/train"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cream text-charcoal text-sm font-medium hover:bg-cream-dark transition-colors shrink-0 group"
        >
          Continue reading
          <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
