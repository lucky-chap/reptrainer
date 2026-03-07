"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Users,
  Mail,
  Shield,
  User,
  Clock,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { InviteMemberModal } from "@/components/team/invite-member-modal";
import { useTeam } from "@/context/team-context";
import { useAuth } from "@/context/auth-context";
import {
  getTeamMembers,
  getPendingInvitations,
  removeTeamMember,
} from "@/lib/db";
import { toast } from "sonner";
import type { TeamMember, Invitation } from "@reptrainer/shared";
import { Badge } from "@/components/ui/badge";

export default function TeamPage() {
  const { user } = useAuth();
  const { activeMembership, isAdmin } = useTeam();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          <h1 className="text-charcoal text-3xl font-bold tracking-tight">
            Team Management
          </h1>
          <p className="text-warm-gray mt-1">
            Manage your team members and invitations.
          </p>
        </div>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex h-12 items-center gap-2 px-4"
          variant={"brand"}
        >
          <Plus className="size-4" />
          Invite Member
        </Button>
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
                    className="flex items-center justify-between py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-charcoal/5 flex size-10 items-center justify-center overflow-hidden rounded-full">
                        {member.userId === user?.uid ? (
                          user?.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="You"
                              className="size-full object-cover"
                            />
                          ) : (
                            <User className="text-charcoal size-5" />
                          )
                        ) : member.userAvatarUrl ? (
                          <img
                            src={member.userAvatarUrl}
                            alt={member.userName || "Team member"}
                            className="size-full object-cover"
                          />
                        ) : (
                          <User className="text-charcoal size-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {member.userId === user?.uid
                            ? "You"
                            : member.userName || member.userId}
                        </p>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                    {member.userId !== user?.uid && (
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

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={fetchData}
      />
    </div>
  );
}
