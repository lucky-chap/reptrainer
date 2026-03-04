"use client";

import Link from "next/link";
import { useState } from "react";
import { Zap, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const ctaHref = user ? "/dashboard" : "/auth/signin";

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
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-warm-gray hover:text-charcoal transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 rounded-full flex items-center gap-2.5 pl-1.5 pr-3 hover:bg-charcoal/5 transition-all"
                  >
                    <div className="relative">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || ""}
                          className="size-7 rounded-full object-cover ring-2 ring-cream-dark"
                        />
                      ) : (
                        <div className="size-7 rounded-full bg-charcoal flex items-center justify-center text-[11px] font-semibold text-cream">
                          {user.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-cream" />
                    </div>
                    <span className="text-sm font-medium text-charcoal">
                      {user.displayName?.split(" ")[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 rounded-xl border border-border/60 bg-white p-0 shadow-lg shadow-charcoal/5"
                  align="end"
                  sideOffset={8}
                  forceMount
                >
                  <div className="px-4 py-3.5 border-b border-border/40">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt=""
                          className="size-9 rounded-full object-cover ring-2 ring-cream-dark"
                        />
                      ) : (
                        <div className="size-9 rounded-full bg-charcoal flex items-center justify-center text-sm font-semibold text-cream">
                          {user.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-charcoal truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-warm-gray truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-charcoal hover:bg-cream cursor-pointer transition-colors"
                      >
                        <LayoutDashboard className="size-4 text-warm-gray" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-warm-gray hover:text-charcoal hover:bg-cream cursor-pointer transition-colors"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-sm text-warm-gray hover:text-charcoal transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
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
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-base text-warm-gray hover:text-charcoal transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={ctaHref}
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-charcoal text-cream text-sm font-medium hover:bg-charcoal-light transition-colors mt-2"
            >
              {user ? "Go to Dashboard" : "Get started now"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
