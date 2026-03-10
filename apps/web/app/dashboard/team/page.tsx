"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Users,
  Mail,
  Shield,
  User,
  Check,
  Sparkles,
  Loader2,
  Settings,
  Trash2,
  Clock,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InviteMemberModal } from "@/components/team/invite-member-modal";
import { useTeam } from "@/context/team-context";
import { useAuth } from "@/context/auth-context";
import {
  updateTeam,
  getTeamMembers,
  getPendingInvitations,
  removeTeamMember,
  seedDemoTeamData,
  removeDemoTeamData,
} from "@/lib/db";
import { toast } from "sonner";
import type { TeamMember, Invitation } from "@reptrainer/shared";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function TeamPage() {
  const { user } = useAuth();
  const { activeMembership, isAdmin } = useTeam();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState(activeMembership?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const hasDemoData = members.some((m) => m.userName === "Amara Okafor");

  const fetchData = async () => {
    if (!activeMembership) return;
    try {
      const [m, i] = await Promise.all([
        getTeamMembers(activeMembership.id),
        getPendingInvitations(activeMembership.id),
      ]);
      setMembers(m);
      setInvitations(i);
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeMembership]);

  useEffect(() => {
    if (activeMembership) {
      setTeamName(activeMembership.name);
    }
  }, [activeMembership]);

  const handleSaveTeamName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMembership || !teamName.trim()) return;

    setIsSavingName(true);
    try {
      await updateTeam(activeMembership.id, {
        name: teamName.trim(),
      });
      toast.success("Team settings updated successfully");
      window.location.reload();
    } catch (error) {
      console.error("Failed to update team:", error);
      toast.error("Failed to update team settings");
    } finally {
      setIsSavingName(false);
    }
  };

  const copyInvitationLink = (id: string) => {
    const link = `${window.location.origin}/invite/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Invitation link copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeMembership) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await removeTeamMember(activeMembership.id, userId);
      await fetchData();
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member.");
    }
  };

  const handleImportDemoData = async () => {
    if (!activeMembership || !user) return;

    setIsSeeding(true);
    const toastId = toast.loading("Seeding demo data...");

    try {
      await seedDemoTeamData(user.uid, activeMembership.id);
      await fetchData();
      toast.success("Demo data imported successfully", { id: toastId });
    } catch (error) {
      console.error("Error seeding demo data:", error);
      toast.error("Failed to import demo data", { id: toastId });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRemoveDemoData = async () => {
    if (!activeMembership || !user) return;

    if (!confirm("Are you sure you want to remove the seeded demo data?"))
      return;

    setIsSeeding(true);
    const toastId = toast.loading("Removing demo data...");

    try {
      await removeDemoTeamData(activeMembership.id);
      await fetchData();
      toast.success("Demo data removed successfully", { id: toastId });
    } catch (error) {
      console.error("Error removing demo data:", error);
      toast.error("Failed to remove demo data", { id: toastId });
    } finally {
      setIsSeeding(false);
    }
  };

  if (!activeMembership || !isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <Shield className="text-warm-gray mb-4 size-12" />
        <h1 className="text-charcoal text-2xl font-bold">Access Denied</h1>
        <p className="text-warm-gray mt-2">
          Only team admins can access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            Team <em>Management.</em>
          </h1>
          <p className="text-warm-gray mt-1">
            Manage members and invitations for{" "}
            <span className="text-charcoal font-semibold">
              {activeMembership.name}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasDemoData && (
            <Button
              onClick={handleRemoveDemoData}
              disabled={isSeeding}
              variant="outline"
              className="flex h-12 items-center gap-2 border-dashed border-red-500/50 px-4 text-red-500 hover:bg-red-500/5"
            >
              {isSeeding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remove Demo Data
            </Button>
          )}
          <Button
            onClick={handleImportDemoData}
            disabled={isSeeding || hasDemoData || loading}
            variant="outline"
            className="border-brand/50 hover:bg-brand/5 flex h-12 items-center gap-2 border-dashed px-4"
          >
            {isSeeding && !hasDemoData ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="text-brand size-4" />
            )}
            {hasDemoData ? "Demo Data Imported" : "Import Demo Data"}
          </Button>
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex h-12 items-center gap-2 px-4"
            variant={"brand"}
          >
            <Plus className="size-4" />
            Invite Member
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Members List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Active Members
            </CardTitle>
            <CardDescription>
              People who have access to this team workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-border/20 h-16 w-full animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-warm-gray py-12 text-center">
                No members found.
              </div>
            ) : (
              <div className="divide-border/40 divide-y">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className={cn(
                      "flex items-center justify-between py-4",
                      member.status === "removed" && "opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-charcoal/5 flex size-10 items-center justify-center overflow-hidden rounded-full">
                        {member.userId === user?.uid ? (
                          user?.photoURL ? (
                            <Image
                              src={user.photoURL}
                              alt="You"
                              className="size-full object-cover"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <User className="text-charcoal size-5" />
                          )
                        ) : member.userAvatarUrl ? (
                          <Image
                            src={member.userAvatarUrl}
                            alt={member.userName || "Team member"}
                            className="size-full object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <User className="text-charcoal size-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {member.userId === user?.uid
                              ? "You"
                              : member.userName || member.userId}
                          </p>
                          {member.status === "removed" && (
                            <Badge
                              variant="secondary"
                              className="border-red-100 bg-red-50 text-[10px] font-bold tracking-wider text-red-600 uppercase"
                            >
                              Removed
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                    {member.userId !== user?.uid &&
                      member.status !== "removed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-warm-gray hover:text-red-500"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations sent but not yet accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-border/20 h-16 w-full animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-warm-gray py-8 text-center text-sm">
                No pending invitations.
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-border/10 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="text-warm-gray size-4" />
                      <span className="truncate text-sm font-medium">
                        {invitation.email}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize"
                      >
                        {invitation.role}
                      </Badge>
                      <span className="text-warm-gray text-[10px]">
                        Expires{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full gap-2 text-xs"
                      onClick={() => copyInvitationLink(invitation.id)}
                    >
                      {copiedId === invitation.id ? (
                        <Check className="size-3 text-green-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      {copiedId === invitation.id
                        ? "Copied"
                        : "Copy Invite Link"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <form onSubmit={handleSaveTeamName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="size-5" />
                  Team Settings
                </CardTitle>
                <CardDescription>
                  Update your team&apos;s name. This will be visible to all
                  members.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName" className="text-sm font-medium">
                    Workspace Name
                  </Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Acme Corp Sales"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 mt-2 flex justify-end rounded-b-xl px-6 py-4">
                <Button
                  type="submit"
                  variant="brand"
                  disabled={
                    isSavingName ||
                    !teamName.trim() ||
                    teamName.trim() === activeMembership.name
                  }
                >
                  {isSavingName ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={fetchData}
      />
    </div>
  );
}
