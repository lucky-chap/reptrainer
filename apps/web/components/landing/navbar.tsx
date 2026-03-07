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
    <header className="bg-cream/80 border-border/40 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
      <div className="landing-section">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="bg-charcoal flex size-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
              <Zap className="text-cream size-5" />
            </div>
            <span className="text-charcoal text-lg font-semibold tracking-tight">
              Reptrainer
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-warm-gray hover:text-charcoal text-sm transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hover:bg-charcoal/5 relative flex h-9 items-center gap-2.5 rounded-full pr-3 pl-1.5 transition-all"
                  >
                    <div className="relative">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || ""}
                          className="ring-cream-dark size-7 rounded-full object-cover ring-2"
                        />
                      ) : (
                        <div className="bg-charcoal text-cream flex size-7 items-center justify-center rounded-full text-[11px] font-semibold">
                          {user.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="ring-cream absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-400 ring-2" />
                    </div>
                    <span className="text-charcoal text-sm font-medium">
                      {user.displayName?.split(" ")[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="border-border/60 shadow-charcoal/5 w-64 rounded-xl border bg-white p-0 shadow-lg"
                  align="end"
                  sideOffset={8}
                  forceMount
                >
                  <div className="border-border/40 border-b px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt=""
                          className="ring-cream-dark size-9 rounded-full object-cover ring-2"
                        />
                      ) : (
                        <div className="bg-charcoal text-cream flex size-9 items-center justify-center rounded-full text-sm font-semibold">
                          {user.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-charcoal truncate text-sm font-semibold">
                          {user.displayName}
                        </p>
                        <p className="text-warm-gray truncate text-xs">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard"
                        className="text-charcoal hover:bg-cream flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors"
                      >
                        <LayoutDashboard className="text-warm-gray size-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-warm-gray hover:text-charcoal hover:bg-cream flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors"
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
                  className="text-warm-gray hover:text-charcoal text-sm transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signin"
                  className="bg-charcoal text-cream hover:bg-charcoal-light inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-charcoal border-r-0 p-2 md:hidden"
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
        <div className="bg-cream border-border/40 animate-fade-in border-t md:hidden">
          <div className="landing-section flex flex-col gap-4 py-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-warm-gray hover:text-charcoal text-base transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={ctaHref}
              onClick={() => setMobileOpen(false)}
              className="bg-charcoal text-cream hover:bg-charcoal-light mt-2 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors"
            >
              {user ? "Go to Dashboard" : "Get started now"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
