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
import { subscribeKnowledgeBase } from "@/lib/db/knowledge";
import type { KnowledgeBase } from "@reptrainer/shared";
import { toast } from "sonner";
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

  const [kb, setKb] = React.useState<KnowledgeBase | null>(null);
  const [kbLoading, setKbLoading] = React.useState(true);

  // Subscribe to KB changes
  useEffect(() => {
    if (!activeMembership || !user) {
      setKbLoading(false);
      return;
    }

    setKbLoading(true);
    const unsub = subscribeKnowledgeBase(
      activeMembership.id,
      (data) => {
        setKb(data);
        setKbLoading(false);
      },
      (error) => {
        console.error("Error subscribing to knowledge base:", error);
        setKbLoading(false);
      },
    );

    return () => unsub();
  }, [activeMembership, user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    } else if (!loading && user && !teamLoading && !kbLoading) {
      if (memberships.length === 0) {
        router.push("/onboarding/team");
      } else {
        // Enforce knowledge base and RAG initialization, but exclude team and knowledge routes
        const isExemptRoute =
          pathname.startsWith("/dashboard/knowledge") ||
          pathname.startsWith("/dashboard/team");

        if (!isExemptRoute && isAdmin) {
          const hasDocs = kb && kb.documents && kb.documents.length > 0;
          const isRagInitialized = !!kb?.ragCorpusId;

          if (!hasDocs) {
            toast.error("Please set up your knowledge base to continue.");
            router.push("/dashboard/knowledge");
            return;
          } else if (!isRagInitialized) {
            toast.error("Please initialize your RAG engine to continue.");
            router.push("/dashboard/knowledge");
            return;
          }
        }

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
  }, [
    user,
    loading,
    memberships,
    teamLoading,
    kbLoading,
    kb,
    isAdmin,
    pathname,
    router,
  ]);

  if (loading || teamLoading || kbLoading || !user) {
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
                  href="/dashboard"
                  className="hover:text-charcoal transition-colors"
                >
                  Dashboard
                </Link>
                <ChevronRight className="size-3 opacity-40" />
                <span className="text-charcoal capitalize">
                  {pathname === "/dashboard"
                    ? "Overview"
                    : pathname.split("/").filter(Boolean).slice(-1)[0]}
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
