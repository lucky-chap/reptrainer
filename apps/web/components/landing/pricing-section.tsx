"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const plans = [
  {
    name: "Free",
    description:
      "Explore the essentials, try core features, and get a feel for how Reptrainer fits your workflow.",
    price: "$0",
    period: "/ month",
    note: "Try Reptrainer hassle-free",
    cta: "Start with Free",
    href: "/dashboard/train",
    featured: false,
    features: [
      "3 roleplay sessions per day",
      "Basic buyer personas",
      "Session performance scores",
      "7-day session history",
    ],
  },
  {
    name: "Pro",
    description:
      "Built for teams ready to close faster and train harder — with zero lock-in.",
    price: "$29",
    period: "/ month",
    note: "Cancel anytime, no minimums",
    cta: "Get Pro",
    href: "/dashboard/train",
    featured: true,
    features: [
      "Unlimited roleplay sessions",
      "Advanced AI buyer personas",
      "Detailed coaching feedback",
      "Full session history & analytics",
      "Custom product configurations",
      "Priority AI response times",
      "Team leaderboards",
    ],
  },
];

export function PricingSection() {
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
      id="pricing"
      className="landing-section py-20 md:py-32"
    >
      {/* Header */}
      <div className="reveal text-center max-w-2xl mx-auto mb-16 md:mb-20">
        <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-4 block">
          Pricing
        </span>
        <h2 className="heading-serif text-3xl md:text-5xl lg:text-6xl text-charcoal mb-6">
          Designed to scale, without <em>locking you in.</em>
        </h2>
        <p className="text-base md:text-lg text-warm-gray leading-relaxed">
          Whether you&apos;re exploring or scaling, Reptrainer fits how you
          work—not the other way around.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            className={`reveal reveal-delay-${i + 1} rounded-2xl border p-8 md:p-10 flex flex-col ${
              plan.featured
                ? "bg-charcoal text-cream border-charcoal"
                : "bg-white border-border/60"
            }`}
          >
            <h3
              className={`text-lg font-semibold mb-2 ${
                plan.featured ? "text-cream" : "text-charcoal"
              }`}
            >
              {plan.name}
            </h3>
            <p
              className={`text-sm leading-relaxed mb-6 ${
                plan.featured ? "text-cream/60" : "text-warm-gray"
              }`}
            >
              {plan.description}
            </p>

            <div className="mb-1">
              <span
                className={`heading-serif text-4xl md:text-5xl ${
                  plan.featured ? "text-cream" : "text-charcoal"
                }`}
              >
                {plan.price}
              </span>
              <span
                className={`text-sm ml-1 ${
                  plan.featured ? "text-cream/50" : "text-warm-gray"
                }`}
              >
                {plan.period}
              </span>
            </div>
            <p
              className={`text-xs mb-8 ${
                plan.featured ? "text-cream/40" : "text-warm-gray-light"
              }`}
            >
              {plan.note}
            </p>

            <Link
              href={ctaHref}
              className={`inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium transition-colors mb-8 ${
                plan.featured
                  ? "bg-cream text-charcoal hover:bg-cream-dark"
                  : "bg-charcoal text-cream hover:bg-charcoal-light"
              }`}
            >
              {user
                ? plan.featured
                  ? "Manage Team"
                  : "Go to Dashboard"
                : plan.cta}
            </Link>

            <div
              className={`border-t pt-6 ${
                plan.featured ? "border-white/10" : "border-border/60"
              }`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wider mb-4 ${
                  plan.featured ? "text-cream/40" : "text-warm-gray"
                }`}
              >
                Includes:
              </p>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      className={`size-4 mt-0.5 shrink-0 ${
                        plan.featured ? "text-emerald-glow" : "text-charcoal"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.featured ? "text-cream/70" : "text-warm-gray"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Why choose */}
      <div className="reveal mt-16 text-center">
        <p className="text-sm text-warm-gray">
          Why choose Reptrainer?{" "}
          <a
            href="#features"
            className="font-medium text-charcoal underline decoration-border underline-offset-4 hover:decoration-charcoal transition-colors"
          >
            See all features
          </a>
        </p>
      </div>
    </section>
  );
}
