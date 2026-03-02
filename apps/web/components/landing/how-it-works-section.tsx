"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Define Your Product",
    description:
      "Enter your product details, pricing, and key value propositions. Reptrainer uses this to generate realistic buyer scenarios tailored to your offering.",
  },
  {
    number: "02",
    title: "Meet Your AI Buyer",
    description:
      "Our AI generates dynamic buyer personas with unique backgrounds, objections, and negotiation styles. Each conversation is different — just like the real world.",
  },
  {
    number: "03",
    title: "Start the Roleplay",
    description:
      "Jump into a live voice conversation with your AI buyer. Navigate objections, build rapport, and practice your close using the Gemini Live API.",
  },
  {
    number: "04",
    title: "Get Instant Coaching",
    description:
      "Receive a detailed performance breakdown with scores on rapport, objection handling, product knowledge, and closing effectiveness.",
  },
];

export function HowItWorksSection() {
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
      id="how-it-works"
      className="landing-section py-20 md:py-32 bg-charcoal text-cream rounded-[2rem] mx-4 md:mx-8"
    >
      {/* Header */}
      <div className="reveal mb-16 md:mb-24">
        <span className="text-xs font-medium uppercase tracking-widest text-cream/40 mb-4 block">
          How It Works
        </span>
        <h2 className="heading-serif text-3xl md:text-5xl lg:text-6xl text-cream max-w-3xl">
          Intelligence that aligns with your <em>sales goals.</em>
        </h2>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className={`reveal reveal-delay-${Math.min(i + 1, 4)} group`}
          >
            <div className="border-t border-white/10 pt-8">
              <span className="text-xs font-mono text-cream/30 mb-3 block">
                {step.number}
              </span>
              <h3 className="text-lg md:text-xl font-semibold text-cream mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-cream/50 leading-relaxed max-w-md">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="reveal flex flex-col sm:flex-row items-start gap-4">
        <Link
          href="/dashboard/train"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-cream text-charcoal text-sm font-medium hover:bg-cream-dark transition-colors group"
        >
          Try it yourself
          <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Help banner */}
      <div className="reveal mt-16 md:mt-24 bg-white/5 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-semibold text-cream mb-1">
            Need some help?
          </h3>
          <p className="text-sm text-cream/50">
            We&apos;re here to provide support and assistance.
          </p>
        </div>
        <a
          href="mailto:hello@reptrainer.com"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-sm text-cream hover:bg-white/5 transition-colors"
        >
          Contact our team
        </a>
      </div>
    </section>
  );
}
