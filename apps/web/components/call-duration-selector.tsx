"use client";

import { useState } from "react";
import { Clock, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CALL_DURATION_OPTIONS,
  CALL_DURATION_MIN,
  CALL_DURATION_MAX,
  CALL_DURATION_DEFAULT,
} from "@reptrainer/shared";

interface CallDurationSelectorProps {
  onSelect: (durationMinutes: number) => void;
  defaultDuration?: number;
}

export function CallDurationSelector({
  onSelect,
  defaultDuration = CALL_DURATION_DEFAULT,
}: CallDurationSelectorProps) {
  const [selected, setSelected] = useState<number>(defaultDuration);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState<string>("");

  const handlePresetSelect = (mins: number) => {
    setSelected(mins);
    setCustomMode(false);
  };

  const handleCustomSubmit = () => {
    const val = parseInt(customValue, 10);
    if (!isNaN(val) && val >= CALL_DURATION_MIN && val <= CALL_DURATION_MAX) {
      setSelected(val);
      onSelect(val);
    }
  };

  return (
    <div className="space-y-5">
      <div className="mb-1 flex items-center gap-2">
        <Timer className="text-charcoal size-4" />
        <h3 className="text-charcoal text-sm font-semibold">Call Duration</h3>
      </div>

      <div className="flex gap-2">
        {CALL_DURATION_OPTIONS.map((mins) => (
          <button
            key={mins}
            onClick={() => handlePresetSelect(mins)}
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
          onClick={() => {
            setCustomMode(true);
            setCustomValue("");
          }}
          className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-all duration-200 ${
            customMode
              ? "bg-charcoal text-cream border-charcoal shadow-md"
              : "text-charcoal border-border/60 hover:border-charcoal/30 bg-white hover:shadow-sm"
          }`}
        >
          Custom
        </button>
      </div>

      {customMode && (
        <div className="animate-fade-up flex items-center gap-3">
          <input
            type="number"
            min={CALL_DURATION_MIN}
            max={CALL_DURATION_MAX}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={`${CALL_DURATION_MIN}-${CALL_DURATION_MAX}`}
            className="border-border/60 bg-cream/30 focus:ring-charcoal/10 focus:border-charcoal/30 h-12 flex-1 rounded-xl border px-4 text-center text-base font-medium focus:ring-2 focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
            }}
          />
          <span className="text-warm-gray text-sm font-medium">minutes</span>
        </div>
      )}

      <Button
        onClick={() => {
          if (customMode) {
            handleCustomSubmit();
          } else {
            onSelect(selected);
          }
        }}
        disabled={
          customMode &&
          (!customValue ||
            parseInt(customValue) < CALL_DURATION_MIN ||
            parseInt(customValue) > CALL_DURATION_MAX)
        }
        className="bg-charcoal text-cream hover:bg-charcoal-light h-12 w-full rounded-xl font-semibold shadow-sm transition-all"
      >
        <Clock className="mr-2 size-4" />
        Call for{" "}
        {customMode
          ? customValue
            ? `${customValue} Minutes`
            : ""
          : `${selected} Minutes`}
      </Button>

      <p className="text-warm-gray-light text-center text-[11px]">
        Call will automatically end when the timer runs out. A 45-second warning
        will be shown.
      </p>
    </div>
  );
}
