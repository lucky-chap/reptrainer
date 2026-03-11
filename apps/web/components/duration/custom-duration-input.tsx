"use client";

import { CALL_DURATION_MIN, CALL_DURATION_MAX } from "@reptrainer/shared";

interface CustomDurationInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}

export function CustomDurationInput({
  value,
  onChange,
  onSubmit,
}: CustomDurationInputProps) {
  return (
    <div className="animate-fade-up flex items-center gap-3">
      <input
        type="number"
        min={CALL_DURATION_MIN}
        max={CALL_DURATION_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${CALL_DURATION_MIN}-${CALL_DURATION_MAX}`}
        className="border-border/60 bg-cream/30 focus:ring-charcoal/10 focus:border-charcoal/30 h-12 flex-1 rounded-xl border px-4 text-center text-base font-medium focus:ring-2 focus:outline-none"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
      />
      <span className="text-warm-gray text-sm font-medium">minutes</span>
    </div>
  );
}
