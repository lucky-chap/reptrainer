"use client";

import { CALL_DURATION_OPTIONS } from "@reptrainer/shared";

interface DurationPresetsProps {
  selected: number;
  customMode: boolean;
  onSelectPreset: (mins: number) => void;
  onCustomToggle: () => void;
}

export function DurationPresets({
  selected,
  customMode,
  onSelectPreset,
  onCustomToggle,
}: DurationPresetsProps) {
  return (
    <div className="flex gap-2">
      {CALL_DURATION_OPTIONS.map((mins) => (
        <button
          key={mins}
          onClick={() => onSelectPreset(mins)}
          className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-all duration-200 ${
            selected === mins && !customMode
              ? "bg-charcoal text-cream border-charcoal shadow-md"
              : "text-charcoal border-border/60 hover:border-charcoal/30 bg-white hover:shadow-sm"
          }`}
        >
          {mins} min
        </button>
      ))}
      <button
        onClick={onCustomToggle}
        className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-all duration-200 ${
          customMode
            ? "bg-charcoal text-cream border-charcoal shadow-md"
            : "text-charcoal border-border/60 hover:border-charcoal/30 bg-white hover:shadow-sm"
        }`}
      >
        Custom
      </button>
    </div>
  );
}
