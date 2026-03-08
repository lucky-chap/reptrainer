"use client";

import {
  Gauge,
  Siren,
  Trash2,
  Building2,
  ChevronRight,
  Users,
} from "lucide-react";
import type { Persona, Product } from "@/lib/db";
import { useGeneration } from "@/context/generation-context";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const intensityLabels = [
  "Friendly Skeptic",
  "Tough Negotiator",
  "Hostile Gatekeeper",
];

interface PersonaCardProps {
  persona: Persona;
  product?: Product;
  index: number;
  onDelete: (id: string) => void;
  teams?: any[];
  onMoveToTeam?: (personaId: string, teamId: string) => void;
}

export function PersonaCard({
  persona,
  product,
  index,
  onDelete,
  teams = [],
  onMoveToTeam,
}: PersonaCardProps) {
  const { tasks } = useGeneration();
  const isGeneratingAvatar = tasks.some(
    (t) => t.personaId === persona.id && t.subStatus === "generating_avatar",
  );

  return (
    <Card
      key={persona.id}
      className="border-border/60 hover:shadow-charcoal/5 group animate-fade-up flex flex-col overflow-hidden shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-charcoal text-cream flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold shadow-sm transition-transform duration-500 group-hover:rotate-3">
              {persona.avatarUrl ? (
                <Image
                  src={persona.avatarUrl}
                  alt={persona.name}
                  className="h-full w-full object-cover"
                  width={48}
                  height={48}
                />
              ) : (
                persona.name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-charcoal truncate text-base font-bold">
                {persona.name}
              </CardTitle>
              <CardDescription className="text-warm-gray/60 truncate text-xs font-semibold">
                {persona.role}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!persona.teamId && teams.length > 0 && onMoveToTeam && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-warm-gray/30 hover:bg-cream-dark hover:text-charcoal -mr-1 transition-opacity group-hover:opacity-100"
                  >
                    <Users className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuLabel className="text-[10px] font-bold tracking-widest uppercase">
                    Move to Team
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => onMoveToTeam(persona.id, team.id)}
                      className="cursor-pointer text-xs font-medium"
                    >
                      {team.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(persona.id);
              }}
              className="text-warm-gray/30 -mr-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-cream/30 border-border/10 flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
            <Gauge className="text-warm-gray/60 size-3" />
            <span className="text-warm-gray/80 text-[10px] font-bold tracking-tight uppercase">
              {intensityLabels[persona.intensityLevel - 1]}
            </span>
          </div>
          <div className="bg-cream/30 border-border/10 flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
            <Siren className="text-warm-gray/60 size-3" />
            <span className="text-warm-gray/80 text-[10px] font-bold tracking-tight uppercase">
              {persona.traits.interruptionFrequency}
            </span>
          </div>
        </div>

        {product && (
          <div className="bg-charcoal/5 border-border/5 flex items-center gap-2 rounded-xl border p-3">
            <Building2 className="text-charcoal/40 size-4" />
            <div className="min-w-0">
              <p className="text-warm-gray/40 text-[9px] font-bold tracking-widest uppercase">
                Product Context
              </p>
              <p className="text-charcoal truncate text-[11px] font-bold">
                {product.companyName}
              </p>
            </div>
          </div>
        )}

        <p className="text-warm-gray line-clamp-2 text-xs leading-relaxed font-medium italic">
          "{persona.objectionStrategy}"
        </p>
      </CardContent>
      <CardFooter className="px-6">
        {isGeneratingAvatar ? (
          <Button
            disabled
            variant="brand"
            className="shadow-charcoal/10 group/btn h-12 w-full rounded-full transition-all"
          >
            Generating Avatar...
          </Button>
        ) : (
          <Button
            asChild
            variant="brand"
            className="shadow-charcoal/10 group/btn h-12 w-full rounded-full transition-all hover:shadow-lg"
          >
            <Link href={`/dashboard/train?personaId=${persona.id}`}>
              Start Roleplay
              <ChevronRight className="ml-1 size-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
