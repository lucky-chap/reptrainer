"use client";

import { useState } from "react";
import { Timer } from "lucide-react";
import {
  CALL_DURATION_MIN,
  CALL_DURATION_MAX,
  CALL_DURATION_DEFAULT,
} from "@reptrainer/shared";
import { DurationPresets } from "./duration/duration-presets";
import { CustomDurationInput } from "./duration/custom-duration-input";
import { StartCallButton } from "./duration/start-call-button";

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

  const isInvalidCustom =
    customMode &&
    (!customValue ||
      parseInt(customValue) < CALL_DURATION_MIN ||
      parseInt(customValue) > CALL_DURATION_MAX);

  return (
    <div className="space-y-5">
      <div className="mb-1 flex items-center gap-2">
        <Timer className="text-charcoal size-4" />
        <h3 className="text-charcoal text-sm font-semibold">Call Duration</h3>
      </div>

      <DurationPresets
        selected={selected}
        customMode={customMode}
        onSelectPreset={handlePresetSelect}
        onCustomToggle={() => {
          setCustomMode(true);
          setCustomValue("");
        }}
      />

      {customMode && (
        <CustomDurationInput
          value={customValue}
          onChange={setCustomValue}
          onSubmit={handleCustomSubmit}
        />
      )}

      <StartCallButton
        onClick={() => (customMode ? handleCustomSubmit() : onSelect(selected))}
        disabled={isInvalidCustom}
        displayValue={customMode ? customValue : selected}
      />

      <p className="text-warm-gray-light text-center text-[11px]">
        Call will automatically end when the timer runs out. A 45-second warning
        will be shown.
      </p>
    </div>
  );
}
