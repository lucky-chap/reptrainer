"use client";

import Link from "next/link";
import { useState } from "react";
import { Zap, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cream/80 border-b border-border/40">
      <div className="landing-section">
        <div className="h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-9 rounded-xl bg-charcoal flex items-center justify-center transition-transform group-hover:scale-105">
              <Zap className="size-5 text-cream" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-charcoal">
              Reptrainer
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-warm-gray hover:text-charcoal transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard/train"
              className="text-sm text-warm-gray hover:text-charcoal transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard/train"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors"
            >
              Get started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-charcoal"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-cream border-t border-border/40 animate-fade-in">
          <div className="landing-section py-6 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-base text-warm-gray hover:text-charcoal transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/dashboard/train"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors mt-2"
            >
              Get started now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
