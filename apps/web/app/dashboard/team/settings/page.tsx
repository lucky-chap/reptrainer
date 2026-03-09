"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { updateTeam, getTeam } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Shield, Settings } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const { activeMembership, isAdmin } = useTeam();
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchTeamDetails() {
      if (!activeMembership || !isAdmin) {
        setLoading(false);
        return;
      }

      try {
        const team = await getTeam(activeMembership.id);
        if (team) {
          setTeamName(team.name);
        }
      } catch (error) {
        console.error("Failed to fetch team details", error);
        toast.error("Failed to load team settings");
      } finally {
        setLoading(false);
      }
    }

    fetchTeamDetails();
  }, [activeMembership, isAdmin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMembership || !teamName.trim()) return;

    setIsSaving(true);
    try {
      await updateTeam(activeMembership.id, {
        name: teamName.trim(),
      });
      toast.success("Team settings updated successfully");

      // We might need to refresh the team context or rely on a subscription if it existed
      // For now, reload to get the fresh data
      window.location.reload();
    } catch (error) {
      console.error("Failed to update team:", error);
      toast.error("Failed to update team settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="border-charcoal/20 border-t-charcoal size-8 animate-spin rounded-full border-2" />
      </div>
    );
  }

  if (!activeMembership || !isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <Shield className="text-warm-gray mb-4 size-12" />
        <h1 className="text-charcoal text-2xl font-bold">Access Denied</h1>
        <p className="text-warm-gray mt-2">
          Only team admins can access team settings.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/dashboard/team")}
        >
          Back to Team
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-charcoal/5 flex size-12 items-center justify-center rounded-xl">
          <Settings className="text-charcoal size-6" />
        </div>
        <div>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            Team <em>Settings</em>
          </h1>
          <p className="text-warm-gray mt-1">
            Manage your team workspace preferences.
          </p>
        </div>
      </div>

      <div className="grid max-w-3xl gap-8">
        <Card>
          <form onSubmit={handleSave}>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>
                Update your team&apos;s name. This will be visible to all
                members.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Workspace Name</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Acme Corp Sales"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 mt-6 flex justify-end px-6 py-4">
              <Button
                type="submit"
                variant="brand"
                disabled={isSaving || !teamName.trim()}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
