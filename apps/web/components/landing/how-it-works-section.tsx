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
      "Jump into a live voice conversation. Navigate objections with real-time Whisper Coach HUD insights that surface as you speak.",
  },
  {
    number: "04",
    title: "Multimodal AI Debrief",
    description:
      "Receive a 4-slide coaching presentation with AI-generated infographics and synchronized voiceover to master your pitch.",
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
      className="landing-section bg-charcoal text-cream mx-4 rounded-[2rem] py-20 md:mx-8 md:py-32"
    >
      {/* Header */}
      <div className="reveal mb-16 md:mb-24">
        <span className="text-cream/40 mb-4 block text-xs font-medium tracking-widest uppercase">
          How It Works
        </span>
        <h2 className="heading-serif text-cream max-w-3xl text-3xl md:text-5xl lg:text-6xl">
          Intelligence that aligns with your <em>sales goals.</em>
        </h2>
      </div>

      {/* Steps */}
      <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className={`reveal reveal-delay-${Math.min(i + 1, 4)} group`}
          >
            <div className="border-t border-white/10 pt-8">
              <span className="text-cream/30 mb-3 block font-mono text-xs">
                {step.number}
              </span>
              <h3 className="text-cream mb-3 text-lg font-semibold md:text-xl">
                {step.title}
              </h3>
              <p className="text-cream/50 max-w-md text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="reveal flex flex-col items-start gap-4 sm:flex-row">
        <Link
          href="/dashboard/train"
          className="bg-cream text-charcoal hover:bg-cream-dark group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-colors"
        >
          Try it yourself
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Help banner */}
      <div className="reveal mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl bg-white/5 p-8 md:mt-24 md:flex-row md:items-center md:p-12">
        <div>
          <h3 className="text-cream mb-1 text-lg font-semibold">
            Need some help?
          </h3>
          <p className="text-cream/50 text-sm">
            We&apos;re here to provide support and assistance.
          </p>
        </div>
        <a
          href="mailto:hello@reptrainer.com"
          className="text-cream inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm transition-colors hover:bg-white/5"
        >
          Contact our team
        </a>
      </div>
    </section>
  );
}
