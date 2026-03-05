"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  TrendingUp,
  Target,
  Zap,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DebriefSlide } from "@reptrainer/shared";

interface CoachDebriefProps {
  slides: DebriefSlide[];
  audioBase64: string[];
  onClose: () => void;
}

export function CoachDebrief({
  slides,
  audioBase64,
  onClose,
}: CoachDebriefProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSlide = slides[currentSlideIndex];

  const handleNext = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentSlideIndex, slides.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentSlideIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = `data:audio/mp3;base64,${audioBase64[currentSlideIndex]}`;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentSlideIndex, audioBase64, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const p = (audio.currentTime / audio.duration) * 100;
      setProgress(p || 0);
    };

    const handleEnded = () => {
      handleNext();
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [handleNext]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="bg-charcoal text-cream animate-in fade-in fixed inset-0 z-[100] flex flex-col items-center justify-center duration-500">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
        <div className="bg-cream/20 absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full blur-[120px]" />
        <div className="bg-charcoal-light/40 absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between p-8">
        <div className="flex items-center gap-4">
          <div className="bg-cream/10 flex size-10 items-center justify-center rounded-xl border border-white/10">
            <Zap className="text-cream size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest uppercase opacity-60">
              Coach Debrief
            </h2>
            <p className="text-xs font-semibold opacity-40">
              Slide {currentSlideIndex + 1} of {slides.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full hover:bg-white/10"
          >
            {isMuted ? (
              <VolumeX className="size-5" />
            ) : (
              <Volume2 className="size-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-white/10"
          >
            <X className="size-6" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="z-10 flex w-full max-w-4xl flex-col items-center gap-12 px-8 md:flex-row">
        {/* Visual Component */}
        <div className="group flex aspect-square w-full items-center justify-center overflow-hidden rounded-[40px] border border-white/5 bg-white/5 shadow-2xl md:w-1/2">
          <VisualDiagram
            type={currentSlide.type}
            description={currentSlide.visual}
          />
        </div>

        {/* Text Area */}
        <div className="w-full space-y-8 md:w-1/2">
          <div className="space-y-4">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
              {currentSlide.type}
            </span>
            <h1 className="heading-serif animate-in slide-in-from-bottom-4 text-4xl leading-tight font-bold duration-700 md:text-5xl lg:text-6xl">
              {currentSlide.title}
            </h1>
          </div>

          <div className="relative">
            <div className="absolute top-0 bottom-0 -left-6 w-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="bg-cream w-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-300 ease-linear"
                style={{ height: `${progress}%` }}
              />
            </div>
            <p className="animate-in fade-in text-xl leading-relaxed font-medium italic opacity-80 delay-300 duration-1000 md:text-2xl">
              &quot;{currentSlide.narration}&quot;
            </p>
          </div>

          <div className="flex items-center gap-6 pt-4">
            <Button
              onClick={togglePlay}
              className="bg-cream text-charcoal group size-14 rounded-full shadow-lg transition-all hover:bg-white active:scale-95"
            >
              {isPlaying ? (
                <Pause className="fill-charcoal size-6" />
              ) : (
                <Play className="fill-charcoal ml-1 size-6" />
              )}
            </Button>

            <div className="flex h-1 flex-1 items-center gap-2 overflow-hidden rounded-full bg-white/10">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    i < currentSlideIndex
                      ? "bg-cream flex-[2]"
                      : i === currentSlideIndex
                        ? "bg-cream flex-[4] shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                        : "flex-1 bg-white/10",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="absolute right-0 bottom-12 left-0 flex justify-center gap-4 px-8">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="h-14 rounded-2xl border-white/10 px-8 text-white/60 hover:bg-white/5 hover:text-white"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          className="h-14 gap-3 rounded-2xl bg-white/10 px-8 text-white hover:bg-white/20"
        >
          {currentSlideIndex === slides.length - 1 ? "Finish" : "Next Slide"}
          <ChevronRight className="size-5" />
        </Button>
        <Button
          variant="ghost"
          onClick={onClose}
          className="gap-2 text-white/40 hover:bg-transparent hover:text-white/80"
        >
          <SkipForward className="size-4" />
          Skip Presentation
        </Button>
      </div>

      <audio
        ref={audioRef}
        muted={isMuted}
        hidden
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}

function VisualDiagram({
  type,
  description,
}: {
  type: string;
  description: string;
}) {
  // Simple CSS/SVG diagrams based on slide type
  switch (type) {
    case "overview":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-8 p-12">
          <div className="flex h-48 w-full max-w-xs items-end gap-3">
            {[65, 85, 45, 95, 75].map((h, i) => (
              <div
                key={i}
                className="animate-in slide-in-from-bottom flex-1 duration-1000"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div
                  className="bg-cream/30 group-hover:bg-cream/40 w-full rounded-t-lg border border-white/20 transition-all duration-1000"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="text-cream/60 flex items-center gap-3">
            <TrendingUp className="size-5" />
            <span className="text-sm font-bold tracking-widest uppercase">
              Performance Index
            </span>
          </div>
        </div>
      );
    case "problem":
      return (
        <div className="relative flex h-full w-full flex-col items-center justify-center p-12">
          <svg
            viewBox="0 0 100 100"
            className="text-cream/40 h-64 w-64 overflow-visible"
          >
            {/* Simple Stick Figure */}
            <circle
              cx="50"
              cy="20"
              r="10"
              stroke="currentColor"
              fill="none"
              strokeWidth="2"
            />
            <line
              x1="50"
              y1="30"
              x2="50"
              y2="70"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="50"
              y1="40"
              x2="30"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="50"
              y1="40"
              x2="70"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="50"
              y1="70"
              x2="35"
              y2="90"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="50"
              y1="70"
              x2="65"
              y2="90"
              stroke="currentColor"
              strokeWidth="2"
            />

            {/* Problem Highlight - Animation */}
            <circle
              cx="50"
              cy="40"
              r="12"
              className="animate-pulse fill-rose-500/20 text-rose-500"
              strokeWidth="2"
            />
            <line
              x1="62"
              y1="40"
              x2="85"
              y2="40"
              className="text-rose-500"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </svg>
          <div className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/10 px-6 py-3">
            <span className="text-sm font-bold tracking-wider text-rose-500">
              CRITICAL FRICTION POINT
            </span>
          </div>
        </div>
      );
    case "correction":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-6 p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-rose-500" />
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">
                Previous Approach
              </span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm opacity-50 blur-[0.5px]">
              &quot;I think our tool might be able to help you save some costs
              if you have the time next week.&quot;
            </div>
          </div>
          <div className="flex justify-center">
            <ChevronRight className="text-cream/20 size-6 rotate-90" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                Better Approach
              </span>
            </div>
            <div className="animate-in zoom-in-95 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium duration-700">
              &quot;Most of our clients in logistics see a 22% reduction in
              operational spend. Should we sync Tuesday to quantify what that
              looks like for you?&quot;
            </div>
          </div>
        </div>
      );
    case "drill":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-12">
          <div className="bg-cream/10 mb-4 flex size-24 items-center justify-center rounded-3xl border border-white/10 shadow-xl transition-transform duration-500 group-hover:scale-110">
            <Target className="text-cream size-12" />
          </div>
          <div className="w-full max-w-xs space-y-3">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-3 opacity-60"
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">
                  {num}
                </div>
                <div className="h-2 flex-1 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}
