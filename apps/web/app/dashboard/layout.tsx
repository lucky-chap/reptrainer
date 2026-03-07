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
  Users,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
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
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";

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
    adminOnly: true,
  },
  {
    label: "Personas",
    href: "/dashboard/personas",
    icon: UserCircle,
    adminOnly: true,
  },
  {
    label: "History",
    href: "/dashboard/history",
    icon: History,
  },
  {
    label: "Team",
    href: "/dashboard/team",
    icon: Users,
    adminOnly: true,
  },
  {
    label: "Team Settings",
    href: "/dashboard/team/settings",
    icon: Settings,
    adminOnly: true,
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

  const {
    memberships,
    activeMembership,
    isAdmin,
    loading: teamLoading,
  } = useTeam();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    } else if (!loading && user && !teamLoading) {
      if (memberships.length === 0) {
        router.push("/onboarding/team");
      } else {
        // Simple access control for admin-only routes
        const currentNavItem = navItems.find(
          (item) =>
            item.href !== "/dashboard" && pathname.startsWith(item.href),
        );
        if (currentNavItem?.adminOnly && !isAdmin) {
          router.push("/dashboard");
        }
      }
    }
  }, [user, loading, memberships, teamLoading, router, pathname, isAdmin]);

  if (loading || teamLoading || !user) {
    return (
      <div className="bg-cream animate-fade-in flex min-h-screen flex-col items-center justify-center">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="bg-cream flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-cream">
          <header className="bg-cream/80 border-border/40 sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b px-6 backdrop-blur-md">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-between">
              <nav className="text-warm-gray flex items-center gap-1.5 text-sm font-medium">
                <Link
                  href="/"
                  className="hover:text-charcoal transition-colors"
                >
                  Home
                </Link>
                <ChevronRight className="size-3 opacity-40" />
                <span className="text-charcoal capitalize">
                  {pathname.split("/").filter(Boolean).slice(-1)[0] ||
                    "Overview"}
                </span>
              </nav>
              <div className="flex items-center gap-4">
                <GenerationBanner tasks={tasks} onDismiss={dismissTask} />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 lg:px-16">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
