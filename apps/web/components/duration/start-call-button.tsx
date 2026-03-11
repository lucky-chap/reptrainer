"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StartCallButtonProps {
  onClick: () => void;
  disabled: boolean;
  displayValue: string | number;
}

export function StartCallButton({
  onClick,
  disabled,
  displayValue,
}: StartCallButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="bg-charcoal text-cream hover:bg-charcoal-light h-12 w-full rounded-xl font-semibold shadow-sm transition-all"
    >
      <Clock className="mr-2 size-4" />
      Call for {displayValue ? `${displayValue} Minutes` : ""}
    </Button>
  );
}
