"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  Swords,
  Package,
  UserCircle,
  History,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
  const { user, loginWithGoogle, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center animate-fade-in">
        <div className="size-8 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
      </div>
    );
  }

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

          {/* Right: User */}
          <div className="flex items-center gap-4">
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
                    <span className="text-sm font-medium text-charcoal hidden sm:inline">
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
              <Button
                onClick={() => loginWithGoogle()}
                className="rounded-full bg-charcoal text-cream hover:bg-charcoal-light transition-all text-sm h-9 px-5"
              >
                Sign In
              </Button>
            )}
          </div>
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
