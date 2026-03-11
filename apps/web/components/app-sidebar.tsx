"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Swords,
  Package,
  UserCircle,
  History,
  Users,
  Activity,
  Zap,
  Settings,
  LogOut,
  ChevronUp,
  Database,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
    label: "Knowledge Base",
    href: "/dashboard/knowledge",
    icon: Database,
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
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: Activity,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isAdmin } = useTeam();

  const activeHref = React.useMemo(() => {
    if (pathname === "/dashboard") return "/dashboard";
    let match = "";
    for (const item of navItems) {
      if (item.href === "/dashboard") continue;
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        if (item.href.length > match.length) {
          match = item.href;
        }
      }
    }
    return match || "/dashboard";
  }, [pathname]);

  return (
    <Sidebar collapsible="icon" className="border-border/40 bg-cream border-r">
      <SidebarHeader className="p-4 pl-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <div className="bg-charcoal flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Zap className="text-cream size-4" />
          </div>
          <span className="text-charcoal text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Reptrainer
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                  const isActive = item.href === activeHref;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-200",
                          isActive
                            ? "bg-charcoal text-cream hover:bg-charcoal/90 hover:text-cream"
                            : "text-warm-gray hover:text-charcoal hover:bg-charcoal/5",
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || ""}
                      className="border-border/40 size-8 rounded-full border object-cover"
                      width={32}
                      height={32}
                    />
                  ) : (
                    <div className="bg-charcoal text-cream flex size-8 items-center justify-center rounded-full text-[11px] font-semibold">
                      {user?.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-semibold">
                      {user?.displayName?.split(" ")[0]}
                    </span>
                    <span className="text-warm-gray truncate text-xs">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg bg-white p-1 shadow-lg"
              >
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive flex cursor-pointer items-center gap-2"
                >
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
