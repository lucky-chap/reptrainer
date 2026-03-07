"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shield, CheckCircle, XCircle, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { getInvitation, acceptInvitation, getTeam } from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import type { Invitation, Team } from "@reptrainer/shared";

export default function InvitePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loginWithGoogle, loading: authLoading } = useAuth();
  const { refreshMemberships } = useTeam();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [status, setStatus] = useState<
    "loading" | "valid" | "invalid" | "expired" | "accepted"
  >("loading");
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const checkInvitation = async () => {
      try {
        const inv = await getInvitation(id);
        if (!inv) {
          setStatus("invalid");
          return;
        }

        if (inv.status === "accepted") {
          setStatus("accepted");
          return;
        }

        const expiry = new Date(inv.expiresAt);
        if (expiry < new Date()) {
          setStatus("expired");
          return;
        }

        const teamData = await getTeam(inv.teamId);
        setTeam(teamData || null);
        setInvitation(inv);
        setStatus("valid");
      } catch (error) {
        console.error("Error checking invitation:", error);
        setStatus("invalid");
      }
    };

    if (id) checkInvitation();
  }, [id]);

  const handleAccept = async () => {
    if (!user || !id) return;
    setIsAccepting(true);
    try {
      await acceptInvitation(id, user.uid);
      await refreshMemberships();
      router.push("/dashboard");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      alert(
        "Failed to accept invitation. It may have expired or been revoked.",
      );
      setIsAccepting(false);
    }
  };

  if (status === "loading" || authLoading) {
    return (
      <div className="bg-cream flex h-screen items-center justify-center">
        <Loader2 className="text-charcoal size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-cream flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="bg-charcoal flex size-10 items-center justify-center rounded-xl shadow-lg">
          <Zap className="text-cream size-6" />
        </div>
        <span className="text-charcoal text-2xl font-bold tracking-tight">
          Reptrainer
        </span>
      </div>

      <Card className="border-border/40 w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {status === "valid"
              ? "Team Invitation"
              : status === "accepted"
                ? "Already Joined"
                : "Invalid Invitation"}
          </CardTitle>
          <CardDescription>
            {status === "valid" ? (
              <>
                You've been invited to join{" "}
                <strong>{team?.name || "a team"}</strong>
              </>
            ) : status === "accepted" ? (
              "You have already accepted this invitation."
            ) : status === "expired" ? (
              "This invitation has expired."
            ) : (
              "This invitation link is invalid or has been revoked."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pb-8">
          {status === "valid" ? (
            <>
              <div className="bg-charcoal/5 flex size-20 items-center justify-center rounded-full">
                <Shield className="text-charcoal size-10" />
              </div>

              <div className="space-y-1 text-center">
                <p className="text-warm-gray text-sm">Invited Role</p>
                <p className="bg-charcoal/5 text-charcoal rounded-full px-4 py-1 text-lg font-semibold capitalize">
                  {invitation?.role}
                </p>
              </div>

              {!user ? (
                <div className="w-full space-y-4">
                  <p className="text-warm-gray text-center text-sm">
                    Please sign in with Google to accept this invitation.
                  </p>
                  <Button
                    onClick={() => loginWithGoogle()}
                    className="h-11 w-full"
                    variant="brand"
                  >
                    Sign In to Join
                  </Button>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <p className="text-warm-gray text-center text-sm">
                    You are signed in as <strong>{user.email}</strong>
                  </p>
                  <Button
                    onClick={handleAccept}
                    className="h-11 w-full"
                    variant="brand"
                    disabled={isAccepting}
                  >
                    {isAccepting ? "Joining..." : "Accept Invitation"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {status === "accepted" ? (
                <CheckCircle className="size-16 text-emerald-500" />
              ) : (
                <XCircle className="size-16 text-red-500" />
              )}
              <Button
                onClick={() => router.push("/dashboard")}
                className="h-11 w-full"
                variant="brandOutline"
              >
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
