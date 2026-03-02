"use client";

import { useEffect, useRef } from "react";
import { Mic, Brain, BarChart3, Users, Shield, Sparkles } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Voice-Based Roleplay",
    description:
      "Practice live sales calls with AI-generated buyer personas using real-time voice interaction powered by Gemini Live API.",
  },
  {
    icon: Brain,
    title: "AI-Powered Coaching",
    description:
      "Get instant feedback on your pitch, objection handling, tone, and closing technique after every session.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track your improvement over time with detailed scoring across multiple competencies and benchmarks.",
  },
  {
    icon: Users,
    title: "Dynamic Buyer Personas",
    description:
      "Train against realistic buyer personalities — from skeptical CFOs to eager early adopters — each with unique objections.",
  },
  {
    icon: Shield,
    title: "Safe Practice Environment",
    description:
      "Make mistakes without consequences. Rehearse high-stakes conversations until your team is deal-ready.",
  },
  {
    icon: Sparkles,
    title: "Adaptive Scenarios",
    description:
      "Reptrainer learns your patterns and generates increasingly challenging scenarios to push your limits.",
  },
];

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 mb-16 md:mb-24">
        <div className="reveal">
          <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-4 block">
            Core Features
          </span>
          <h2 className="heading-serif text-3xl md:text-5xl lg:text-6xl text-charcoal">
            What you need, before you <em>know</em> you need it.
          </h2>
        </div>
        <div className="reveal reveal-delay-1 flex items-end">
          <p className="text-base md:text-lg text-warm-gray leading-relaxed max-w-lg">
            Reptrainer evolves with you, learning your patterns and pushing
            what&apos;s next into now. No retraining, no friction—just a system
            that grows with your team.
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className={`reveal reveal-delay-${Math.min(i + 1, 4)} group bg-white rounded-2xl border border-border/60 p-8 hover:shadow-lg hover:shadow-charcoal/5 transition-all duration-300`}
          >
            <div className="size-12 rounded-xl bg-cream-dark flex items-center justify-center mb-5 group-hover:bg-charcoal group-hover:text-cream transition-colors duration-300">
              <feature.icon className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-charcoal mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-warm-gray leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Quote banner */}
      <div className="reveal mt-16 md:mt-24 bg-white rounded-2xl border border-border/60 p-10 md:p-16 text-center">
        <blockquote className="heading-serif text-xl md:text-2xl lg:text-3xl text-charcoal max-w-3xl mx-auto mb-6">
          &ldquo;We now rely on Reptrainer for all our sales readiness
          needs.&rdquo;
        </blockquote>
        <p className="text-sm text-warm-gray">
          — VP of Sales, Fortune 500 Enterprise
        </p>
      </div>
    </section>
  );
}
