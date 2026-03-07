"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { createTeam, getUserTeams } from "@/lib/db";
import { useTeam } from "@/context/team-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, Users, Loader2 } from "lucide-react";

export default function TeamOnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [checkingTeams, setCheckingTeams] = useState(true);
  const { refreshMemberships } = useTeam();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (user) {
      const checkExistingTeams = async () => {
        const teams = await getUserTeams(user.uid);
        if (teams.length > 0) {
          router.push("/dashboard");
        } else {
          setCheckingTeams(false);
        }
      };
      checkExistingTeams();
    }
  }, [user, authLoading, router]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !teamName.trim()) return;

    setIsCreating(true);
    try {
      await createTeam(teamName.trim(), user.uid);
      await refreshMemberships();
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create team:", error);
      setIsCreating(false);
    }
  };

  if (authLoading || checkingTeams) {
    return (
      <div className="bg-cream flex min-h-screen flex-col items-center justify-center p-6">
        <Loader2 className="text-charcoal size-8 animate-spin" />
        <p className="text-warm-gray mt-4 text-sm font-medium">
          Preparing your workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-cream flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-charcoal flex size-10 items-center justify-center rounded-xl">
          <Zap className="text-cream size-6" />
        </div>
        <h1 className="text-charcoal text-2xl font-bold tracking-tight">
          Reptrainer
        </h1>
      </div>

      <Card className="border-border/40 shadow-charcoal/5 w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="bg-charcoal/5 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
            <Users className="text-charcoal size-6" />
          </div>
          <CardTitle className="text-2xl">Create your team</CardTitle>
          <CardDescription>
            Collaborate with your colleagues and share roleplay insights.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateTeam}>
          <CardContent className="space-y-4">
            <div className="mb-4 space-y-2">
              <label
                htmlFor="teamName"
                className="text-charcoal text-sm font-medium"
              >
                Team Name
              </label>
              <Input
                id="teamName"
                placeholder="Acme Sales Team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                disabled={isCreating}
                className="bg-white"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isCreating || !teamName.trim()}
              className="bg-charcoal text-cream hover:bg-charcoal-light w-full gap-2 py-6 text-base font-semibold transition-all"
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating Team...
                </>
              ) : (
                "Continue to Dashboard"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="text-warm-gray mt-8 text-center text-sm">
        Setting up a team allows you to organize products, personas, <br />
        and training sessions for your entire organization.
      </p>
    </div>
  );
}
