"use client";

import { useEffect, useRef } from "react";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "Reptrainer replaced three training tools we were duct-taping together — and does the job better. It's fast, elegant, and genuinely understands how sales teams learn.",
    name: "Cassandra H.",
    role: "VP of Sales, Continuum",
    initials: "CH",
  },
  {
    quote:
      "Setup took minutes, and within hours our reps were running smoother sessions. The AI personas are shockingly realistic — it's easily one of the smartest investments we've made this quarter.",
    name: "Caleb P.",
    role: "Head of Enablement, Baincroft",
    initials: "CP",
  },
  {
    quote:
      "Reptrainer just quietly gets the job done. It's taken the chaos out of onboarding new reps. Our ramp-up time dropped from weeks to days.",
    name: "Daniel K.",
    role: "Sales Manager, Otto Labs",
    initials: "DK",
  },
  {
    quote:
      "We were drowning in outdated roleplays and scripted scenarios. Reptrainer replaced all of it without a hitch. The clarity it brings to coaching is unreal.",
    name: "Maya S.",
    role: "Director of Revenue, Kindred",
    initials: "MS",
  },
];

export function TestimonialsSection() {
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
      id="testimonials"
      className="landing-section py-20 md:py-32"
    >
      {/* Header */}
      <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 mb-16 md:mb-20">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-warm-gray mb-4 block">
            Customer Success
          </span>
          <h2 className="heading-serif text-3xl md:text-5xl lg:text-6xl text-charcoal">
            Real-time data and <em>insight.</em>
          </h2>
        </div>
      </div>

      {/* Testimonial grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className={`reveal reveal-delay-${Math.min(i + 1, 4)} bg-white rounded-2xl border border-border/60 p-8 md:p-10 flex flex-col justify-between hover:shadow-lg hover:shadow-charcoal/5 transition-all duration-300`}
          >
            <div>
              {/* Stars */}
              <div className="flex gap-0.5 mb-6">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className="size-4 fill-amber-glow text-amber-glow"
                  />
                ))}
              </div>
              <blockquote className="text-sm md:text-base text-charcoal leading-relaxed mb-8">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-charcoal flex items-center justify-center text-xs font-bold text-cream">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-charcoal">{t.name}</p>
                <p className="text-xs text-warm-gray">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rating band */}
      <div className="reveal mt-12 flex items-center justify-center gap-3">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="size-4 fill-amber-glow text-amber-glow" />
          ))}
        </div>
        <span className="text-sm text-warm-gray">
          Rated 4.97/5 from 500+ reviews
        </span>
      </div>
    </section>
  );
}
