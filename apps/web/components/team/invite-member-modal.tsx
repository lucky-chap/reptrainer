"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInvitation } from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { toast } from "sonner";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent?: () => void;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  onInviteSent,
}: InviteMemberModalProps) {
  const { user } = useAuth();
  const { activeMembership } = useTeam();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeMembership) return;

    setIsSubmitting(true);
    try {
      await createInvitation(activeMembership.id, email, user.uid, role);
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setRole("member");
      onInviteSent?.();
      onClose();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value: "admin" | "member") => setRole(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-warm-gray text-xs">
              Admins can manage team members, products, and personas.
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !email}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
