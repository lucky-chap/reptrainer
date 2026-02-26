"use client";

import { useState } from "react";
import { AppShell, type AppView } from "@/components/app-shell";
import { ProductSetup } from "@/components/product-setup";
import { PersonaGenerator } from "@/components/persona-generator";
import { RoleplaySession } from "@/components/roleplay-session";
import { SessionHistory } from "@/components/session-history";
import type { Persona } from "@/lib/db";

export default function Home() {
  const [currentView, setCurrentView] = useState<AppView>("products");
  const [activePersona, setActivePersona] = useState<Persona | null>(null);

  const handleStartRoleplay = (persona: Persona) => {
    setActivePersona(persona);
    setCurrentView("roleplay");
  };

  const handleBackFromRoleplay = () => {
    setActivePersona(null);
    setCurrentView("personas");
  };

  return (
    <AppShell currentView={currentView} onViewChange={setCurrentView}>
      {currentView === "products" && <ProductSetup />}
      {currentView === "personas" && (
        <PersonaGenerator onStartRoleplay={handleStartRoleplay} />
      )}
      {currentView === "roleplay" && activePersona && (
        <RoleplaySession
          persona={activePersona}
          onBack={handleBackFromRoleplay}
        />
      )}
      {currentView === "roleplay" && !activePersona && (
        <PersonaGenerator onStartRoleplay={handleStartRoleplay} />
      )}
      {currentView === "history" && <SessionHistory />}
    </AppShell>
  );
}
