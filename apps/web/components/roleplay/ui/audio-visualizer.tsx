"use client";

interface AudioVisualizerProps {
  isSpeaking: boolean;
}

export function AudioVisualizer({ isSpeaking }: AudioVisualizerProps) {
  return (
    <div className="mt-2 flex h-6 items-end gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-0.5 rounded-full bg-neutral-300 transition-all duration-300 ${
            isSpeaking ? "animate-sound-wave" : "h-0.5"
          }`}
          style={{
            animationDelay: `${i * 0.1}s`,
            height: isSpeaking ? undefined : "2px",
          }}
        />
      ))}
    </div>
  );
}
