"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, Mail } from "lucide-react";
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
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeMembership) return;

    if (email.toLowerCase().trim() === user.email?.toLowerCase().trim()) {
      toast.error("You cannot invite yourself to the team.");
      return;
    }

    setIsSubmitting(true);
    try {
      const invite = await createInvitation(
        activeMembership.id,
        email.trim(),
        user.uid,
        role,
      );
      const link = `${window.location.origin}/invite/${invite.id}`;
      setInvitationLink(link);
      toast.success(`Invitation created for ${email}`);
      onInviteSent?.();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to create invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!invitationLink) return;
    navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setEmail("");
    setInvitationLink(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleReset}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {invitationLink ? "Invitation Link Ready" : "Invite Team Member"}
          </DialogTitle>
        </DialogHeader>

        {invitationLink ? (
          <div className="w-full max-w-md space-y-6 py-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-green-100">
                <Check className="size-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Invitation Created</h3>
              <p className="text-warm-gray mt-1 text-sm">
                Share this link with your teammate. It will expire in 3 days.
              </p>
            </div>

            <div className="grid w-full grid-cols-6 items-center gap-2">
              <div className="bg-border/10 col-span-5 flex-1 truncate rounded-lg border p-3 font-mono text-sm">
                {invitationLink}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="col-span-1 h-full w-full shrink-0"
              >
                {copied ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>

            {/* <DialogFooter className="w-full">
              <Button onClick={handleReset} className="w-full">
                Done
              </Button>
            </DialogFooter> */}
          </div>
        ) : (
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
                {isSubmitting ? "Creating..." : "Generate Link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
