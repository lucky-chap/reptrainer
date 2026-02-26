"use client";

import { Package, UserCircle, Phone, History, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppView = "products" | "personas" | "roleplay" | "history";

interface AppShellProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  children: React.ReactNode;
}

const navItems: { id: AppView; label: string; icon: React.ElementType }[] = [
  { id: "products", label: "Products", icon: Package },
  { id: "personas", label: "Personas", icon: UserCircle },
  { id: "roleplay", label: "Roleplay", icon: Phone },
  { id: "history", label: "History", icon: History },
];

export function AppShell({
  currentView,
  onViewChange,
  children,
}: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-glow/20 to-emerald-glow/5 border border-emerald-glow/20 flex items-center justify-center">
              <Zap className="size-5 text-emerald-glow" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Reptrainer</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5 tracking-wide uppercase">
                Sales Flight Simulator
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  currentView === item.id
                    ? "bg-emerald-glow/10 text-emerald-glow border border-emerald-glow/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Nav */}
      <nav className="sm:hidden glass sticky bottom-0 border-t border-border/50 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                currentView === item.id
                  ? "text-emerald-glow"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
