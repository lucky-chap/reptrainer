"use client";

import Image from "next/image";
import { ArrowLeft, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { Persona, KnowledgeMetadata } from "@/lib/db";

interface NameInputStageProps {
  sessionUserName: string;
  setSessionUserName: (name: string) => void;
  setNameSubmitted: (submitted: boolean) => void;
  onBack: () => void;
  persona: Persona;
  avatarUrl: string | null;
  knowledgeMetadata?: KnowledgeMetadata;
}

export function NameInputStage({
  sessionUserName,
  setSessionUserName,
  setNameSubmitted,
  onBack,
  persona,
  avatarUrl,
  knowledgeMetadata,
}: NameInputStageProps) {
  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <Card className="border-border/60 mx-auto max-w-lg rounded-3xl border bg-white p-10 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="bg-cream mb-6 flex size-20 items-center justify-center rounded-2xl">
            <User className="text-charcoal size-10" />
          </div>
          <h2 className="heading-serif text-charcoal mb-3 text-3xl">
            Before We Start
          </h2>
          <p className="text-warm-gray mb-8 max-w-sm text-sm leading-relaxed">
            Enter your name so {persona.name} knows who they&apos;re meeting
            with. This will be used in the transcript.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (sessionUserName.trim()) setNameSubmitted(true);
            }}
            className="w-full space-y-5"
          >
            <Input
              value={sessionUserName}
              onChange={(e) => setSessionUserName(e.target.value)}
              placeholder="Your name (e.g., Alex Johnson)"
              className="border-border/60 bg-cream/30 focus:ring-charcoal/10 h-14 rounded-2xl text-center text-base transition-all focus:bg-white"
              autoFocus
              required
            />
            <Button
              type="submit"
              className="bg-charcoal text-cream hover:bg-charcoal-light h-14 w-full gap-3 rounded-2xl text-base font-semibold shadow-md transition-all active:scale-[0.98]"
              disabled={!sessionUserName.trim()}
            >
              Continue
              <Phone className="size-5" />
            </Button>
          </form>
        </div>
      </Card>

      {/* Persona preview */}
      <Card className="border-border/40 mx-auto max-w-lg rounded-2xl border bg-white/60 p-5">
        <div className="flex items-center gap-4">
          {persona.avatarUrl || avatarUrl ? (
            <Image
              src={
                persona.avatarUrl ||
                (avatarUrl as string) ||
                "/placeholder-avatar.png"
              }
              alt={persona.name}
              width={48}
              height={48}
              className="bg-cream shrink-0 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div className="bg-charcoal text-cream flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold">
              {persona.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-charcoal truncate text-sm font-semibold">
              {persona.name}
            </h3>
            <p className="text-warm-gray truncate text-xs">{persona.role}</p>
          </div>
          <div className="text-warm-gray-light bg-cream/50 border-border/20 rounded-full border px-3 py-1 text-[11px] font-medium">
            {knowledgeMetadata?.productCategory
              ? `Evaluating ${knowledgeMetadata.productCategory}`
              : "General AI Coaching"}
          </div>
        </div>
      </Card>
    </div>
  );
}
