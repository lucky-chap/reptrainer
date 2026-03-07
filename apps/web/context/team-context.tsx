"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import {
  getUserMemberships,
  subscribeUserMemberships,
  type TeamWithRole,
} from "@/lib/db";

interface TeamContextType {
  memberships: TeamWithRole[];
  activeMembership: TeamWithRole | null;
  loading: boolean;
  isAdmin: boolean;
  refreshMemberships: () => Promise<void>;
  setActiveTeam: (teamId: string) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<TeamWithRole[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeUserMemberships(
      user.uid,
      (data) => {
        setMemberships(data);
        if (data.length > 0 && !activeTeamId) {
          setActiveTeamId(data[0].id);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Team membership subscription error:", err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const activeMembership =
    memberships.find((m) => m.id === activeTeamId) || null;
  const isAdmin = activeMembership?.role === "admin";

  const refreshMemberships = async () => {
    // Subscription handles updates automatically, but we keep this for legacy calls
    setLoading(true);
    const data = await getUserMemberships(user?.uid || "");
    setMemberships(data);
    setLoading(false);
  };

  const setActiveTeam = (teamId: string) => {
    setActiveTeamId(teamId);
  };

  return (
    <TeamContext.Provider
      value={{
        memberships,
        activeMembership,
        loading,
        isAdmin,
        refreshMemberships,
        setActiveTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
