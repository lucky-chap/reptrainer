"use client";

interface AudioVisualizerProps {
  isSpeaking: boolean;
}

export function AudioVisualizer({ isSpeaking }: AudioVisualizerProps) {
  return (
    <div className="mt-2 flex h-8 items-end gap-1.5">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className={`bg-charcoal/40 w-1 rounded-full transition-all duration-300 ${
            isSpeaking ? "animate-sound-wave" : "h-1"
          }`}
          style={{
            animationDelay: `${i * 0.12}s`,
            height: isSpeaking ? undefined : "4px",
          }}
        />
      ))}
    </div>
  );
}
