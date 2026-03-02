"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  Swords,
  Package,
  UserCircle,
  History,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Train",
    href: "/dashboard/train",
    icon: Swords,
  },
  {
    label: "Products",
    href: "/dashboard/products",
    icon: Package,
  },
  {
    label: "Personas",
    href: "/dashboard/personas",
    icon: UserCircle,
  },
  {
    label: "History",
    href: "/dashboard/history",
    icon: History,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-cream">
      {/* Top Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cream/80 border-b border-border/40">
        <div className="px-6 md:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo + Back */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-warm-gray hover:text-charcoal transition-colors group"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm hidden sm:inline">Home</span>
            </Link>
            <div className="h-6 w-px bg-border/60" />
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-charcoal flex items-center justify-center">
                <Zap className="size-4 text-cream" />
              </div>
              <span className="text-base font-semibold tracking-tight text-charcoal">
                Reptrainer
              </span>
            </Link>
          </div>

          {/* Center: Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-charcoal text-cream"
                      : "text-warm-gray hover:text-charcoal hover:bg-charcoal/5",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: placeholder */}
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="px-6 md:px-10 lg:px-16 xl:px-24 py-8 md:py-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-cream/90 border-t border-border/40 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                  isActive ? "text-charcoal" : "text-warm-gray",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
