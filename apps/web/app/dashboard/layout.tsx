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
import {
  GenerationProvider,
  useGeneration,
} from "@/context/generation-context";
import { GenerationBanner } from "@/components/generation-banner";

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
  return (
    <GenerationProvider>
      <DashboardContent>{children}</DashboardContent>
    </GenerationProvider>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { tasks, dismissTask } = useGeneration();
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
      <div className="bg-cream animate-fade-in flex min-h-screen flex-col items-center justify-center">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <div className="bg-cream min-h-screen">
      {/* Top Nav */}
      <header className="bg-cream/80 border-border/40 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6 md:px-8">
          {/* Left: Logo + Back */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-warm-gray hover:text-charcoal group flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden text-sm sm:inline">Home</span>
            </Link>
            <div className="bg-border/60 h-6 w-px" />
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="bg-charcoal flex size-8 items-center justify-center rounded-lg">
                <Zap className="text-cream size-4" />
              </div>
              <span className="text-charcoal text-base font-semibold tracking-tight">
                Reptrainer
              </span>
            </Link>
          </div>

          {/* Center: Nav */}
          <nav className="hidden items-center gap-1 md:flex">
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
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
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
                    <span className="text-charcoal hidden text-sm font-medium sm:inline">
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
              <Button
                onClick={() => loginWithGoogle()}
                className="bg-charcoal text-cream hover:bg-charcoal-light h-9 rounded-full px-5 text-sm transition-all"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen pt-16">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-12 lg:px-16 xl:px-24">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="bg-cream/90 border-border/40 fixed right-0 bottom-0 left-0 z-50 border-t px-2 py-2 backdrop-blur-md md:hidden">
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
                  "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
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

      {/* Global Activity Indicator */}
      <GenerationBanner tasks={tasks} onDismiss={dismissTask} />
    </div>
  );
}
