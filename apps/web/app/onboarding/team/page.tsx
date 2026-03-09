"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  createTeam,
  getUserMemberships,
  getAllUserMemberships,
  acceptInvitation,
} from "@/lib/db";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Users, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function TeamOnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [checkingTeams, setCheckingTeams] = useState(true);
  const [loadingText, setLoadingText] = useState("Preparing your workspace...");
  const [wasRemoved, setWasRemoved] = useState(false);
  const { refreshMemberships } = useTeam();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (user) {
      const checkExistingTeams = async () => {
        const [activeTeams, allMemberships] = await Promise.all([
          getUserMemberships(user.uid),
          getAllUserMemberships(user.uid),
        ]);

        if (activeTeams.length > 0) {
          const isAdmin = activeTeams.some((t) => t.role === "admin");
          setLoadingText(
            isAdmin
              ? "Preparing your workspace..."
              : "Setting up your training environment...",
          );
          router.push("/dashboard");
        } else {
          const hasBeenRemoved = allMemberships.some(
            (m) => m.status === "removed",
          );
          setWasRemoved(hasBeenRemoved);
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
      toast.error("Failed to create team. Please try again.");
      setIsCreating(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setIsJoining(true);
    try {
      await acceptInvitation(
        inviteCode.trim(),
        user.uid,
        user.displayName || undefined,
        user.photoURL || undefined,
      );
      await refreshMemberships();
      toast.success("Joined team successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to join team:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join team.",
      );
      setIsJoining(false);
    }
  };

  if (authLoading || checkingTeams) {
    return (
      <div className="bg-cream flex min-h-screen flex-col items-center justify-center p-6">
        <Loader2 className="text-charcoal size-8 animate-spin" />
        <p className="text-warm-gray mt-4 text-sm font-medium">{loadingText}</p>
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
          <div className="bg-charcoal/5 mx-auto mb-1 flex size-12 items-center justify-center rounded-full">
            <Users className="text-charcoal size-6" />
          </div>
          <CardTitle className="my-2 font-serif text-4xl">
            {wasRemoved ? "Join a new team" : "Welcome to Reptrainer"}
          </CardTitle>
          <CardDescription>
            {wasRemoved
              ? "You are no longer part of your previous team. Join a new one or create your own."
              : "Collaborate with your colleagues and share roleplay insights."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Team</TabsTrigger>
              <TabsTrigger value="join">Join Team</TabsTrigger>
            </TabsList>
            <TabsContent value="create">
              <form onSubmit={handleCreateTeam} className="mt-4 space-y-4">
                <div className="space-y-2">
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
                    "Create Team"
                  )}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="join">
              <form onSubmit={handleJoinTeam} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="inviteCode"
                    className="text-charcoal text-sm font-medium"
                  >
                    Invitation Code
                  </label>
                  <Input
                    id="inviteCode"
                    placeholder="Enter your code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    disabled={isJoining}
                    className="bg-white"
                  />
                  <p className="text-warm-gray text-xs">
                    Paste the code from your invitation link or enter it
                    manually.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isJoining || !inviteCode.trim()}
                  className="bg-charcoal text-cream hover:bg-charcoal-light w-full gap-2 py-6 text-base font-semibold transition-all"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Joining Team...
                    </>
                  ) : (
                    <>
                      <LogIn className="size-4" />
                      Join Team
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-warm-gray mt-8 text-center text-sm">
        Setting up a team allows you to organize products, personas, <br />
        and training sessions for your entire organization.
      </p>
    </div>
  );
}
