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
  Mic2,
} from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DebriefSlide } from "@reptrainer/shared";
import Image from "next/image";

interface CoachDebriefProps {
  slides: DebriefSlide[];
  audioBase64?: string[];
  audioUrls?: string[];
  onClose: () => void;
}

export function CoachDebrief({
  slides,
  audioBase64 = [],
  audioUrls = [],
  onClose,
}: CoachDebriefProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [audioAllowed, setAudioAllowed] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSlide = slides[currentSlideIndex];

  const handleNext = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
      setProgress(0);
      setIsPlaying(true);
    } else {
      setIsFinished(true);
    }
  }, [currentSlideIndex, slides.length]);

  const handlePrev = useCallback(() => {
    if (isFinished) {
      setIsFinished(false);
      return;
    }
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setProgress(0);
    setIsPlaying(true);
  }, [isFinished]);

  // Handle slide changes and 1s stall to simulate pause
  useEffect(() => {
    setAudioAllowed(false);
    const timer = setTimeout(() => {
      setAudioAllowed(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentSlideIndex]);

  // 1. Handle slide changes and audio source loading
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const base64 = audioBase64[currentSlideIndex];
    const url = audioUrls[currentSlideIndex];

    // Reset state for new slide
    audio.pause();
    setProgress(0);

    if (url) {
      audio.src = url;
      audio.load();
    } else if (base64) {
      audio.src = `data:audio/mpeg;base64,${base64}`;
      audio.load();
    } else {
      audio.removeAttribute("src");
      audio.load();
    }
  }, [currentSlideIndex, audioBase64, audioUrls]);

  // 2. Play/Pause state synchronization
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasInteracted || !audioAllowed || isFinished) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
        }
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, hasInteracted, currentSlideIndex, audioAllowed, isFinished]);

  // 3. Fallback timer for missing audio
  useEffect(() => {
    if (
      !hasInteracted ||
      !isPlaying ||
      audioBase64[currentSlideIndex] ||
      audioUrls[currentSlideIndex] ||
      !audioAllowed ||
      isFinished
    )
      return;

    const timer = setTimeout(() => handleNext(), 5000);
    return () => clearTimeout(timer);
  }, [
    currentSlideIndex,
    audioBase64,
    hasInteracted,
    isPlaying,
    handleNext,
    audioAllowed,
    isFinished,
  ]);

  // 4. Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        const p = (audio.currentTime / audio.duration) * 100;
        setProgress(p || 0);
      }
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
    if (!audioRef.current || isFinished) return;

    if (!hasInteracted) {
      setHasInteracted(true);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((prev) => !prev);
  };

  const handleStartInteraction = () => {
    setHasInteracted(true);
    setIsPlaying(true);
  };

  if (isFinished) {
    return (
      <div className="bg-charcoal text-cream animate-in fade-in fixed inset-0 z-100 flex flex-col items-center justify-center duration-500">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
          <div className="bg-cream/20 absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full blur-[120px]" />
          <div className="bg-charcoal-light/40 absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full blur-[120px]" />
        </div>

        <div className="animate-in zoom-in-95 relative z-10 flex max-w-lg flex-col items-center gap-8 text-center duration-700">
          <div className="bg-cream/10 relative flex size-24 items-center justify-center rounded-3xl border border-white/10 shadow-2xl">
            <div className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
              <Zap className="size-4 fill-white text-white" />
            </div>
            <RotateCcw className="text-cream h-10 w-10 rotate-45" />
          </div>

          <div className="space-y-4">
            <h1 className="heading-serif text-4xl font-bold sm:text-5xl">
              Debrief Complete
            </h1>
            <p className="text-cream/60 text-lg leading-relaxed font-medium italic">
              Analysis concluded. You have identified key growth areas to
              dominate your next session.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 px-8 pt-4 sm:flex-row">
            <Button
              variant="brandOutline"
              onClick={() => setIsFinished(false)}
              className="h-12 flex-1 rounded-2xl border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
            >
              Back to Slides
            </Button>
            <Button
              onClick={onClose}
              className="bg-cream text-charcoal h-12 flex-1 rounded-2xl font-bold shadow-lg transition-all hover:bg-white"
            >
              Return to Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-charcoal text-cream animate-in fade-in fixed inset-0 z-100 flex flex-col items-center justify-center duration-500">
      {!hasInteracted && (
        <div
          className="bg-charcoal/80 absolute inset-0 z-200 flex cursor-pointer items-center justify-center backdrop-blur-sm transition-opacity duration-300"
          onClick={handleStartInteraction}
        >
          <div className="animate-in zoom-in-95 flex flex-col items-center gap-6 duration-500">
            <div className="bg-cream text-charcoal shadow-cream/20 flex size-20 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105">
              <Play className="ml-1 size-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Click anywhere to start debrief
            </h2>
          </div>
        </div>
      )}
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
          {/* Narrator Pulse Indicator */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-cream/10 flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5"
              >
                <div className="flex h-3 items-end gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: [4, 12, 4],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className="bg-cream w-0.5 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
                  Narrator
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full p-5 hover:bg-white/10 hover:text-zinc-300"
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
            className="rounded-full p-5 hover:bg-white/10 hover:text-zinc-300"
          >
            <X className="size-6" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className={cn(
          "relative z-10 flex w-full max-w-400 flex-col items-center gap-12 px-4 py-24 transition-all duration-1000 sm:px-8 md:flex-row md:py-0",
          !hasInteracted && "scale-95 opacity-20 blur-sm",
        )}
      >
        <motion.div
          key={currentSlideIndex}
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="group flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-[30px] border border-white/5 bg-white/5 shadow-2xl sm:rounded-[40px] md:w-3/5"
        >
          <VisualDiagram
            type={currentSlide.type}
            description={currentSlide.visual}
            visualUrl={currentSlide.visualUrl}
          />
        </motion.div>

        {/* Text Area */}
        <div className="flex w-full flex-col justify-center space-y-8 sm:space-y-10 md:w-2/5 md:pl-8">
          <div className="space-y-3 sm:space-y-4">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
              {currentSlide.type}
            </span>
            <h1 className="heading-serif animate-in slide-in-from-bottom-4 text-3xl leading-tight font-bold duration-700 sm:text-4xl">
              {currentSlide.title}
            </h1>
          </div>

          <div className="relative">
            <div className="absolute top-0 bottom-0 -left-2 w-1 overflow-hidden rounded-full bg-white/10 sm:-left-4 md:-left-6">
              <div
                className="bg-cream w-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-300 ease-linear"
                style={{ height: `${progress}%` }}
              />
            </div>
            <p className="animate-in fade-in ml-2 text-sm leading-relaxed font-medium italic opacity-85 delay-300 duration-1000 sm:ml-0 sm:text-xl md:text-2xl">
              &quot;{currentSlide.narration}&quot;
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2 sm:gap-6 sm:pt-4">
            <Button
              onClick={togglePlay}
              className="bg-cream text-charcoal group relative z-10 size-12 shrink-0 rounded-full shadow-lg transition-all hover:bg-white active:scale-95 sm:size-14"
            >
              {isPlaying ? (
                <Pause className="fill-charcoal size-5 sm:size-6" />
              ) : (
                <Play className="fill-charcoal ml-1 size-5 sm:size-6" />
              )}
            </Button>

            <div className="flex h-1 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-full sm:gap-2">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-full cursor-pointer rounded-full transition-all duration-500 hover:bg-white/40",
                    i < currentSlideIndex
                      ? "bg-cream flex-2"
                      : i === currentSlideIndex
                        ? "bg-cream flex-4 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                        : "flex-1 bg-white/10",
                  )}
                  onClick={() => {
                    setCurrentSlideIndex(i);
                    setProgress(0);
                    if (hasInteracted) setIsPlaying(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="from-charcoal via-charcoal/80 absolute right-0 bottom-4 left-0 z-20 flex justify-center gap-3 bg-linear-to-t to-transparent px-4 pt-12 pb-4 sm:bottom-6 sm:gap-4 sm:px-8">
        <Button
          variant="brandOutline"
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="h-10 rounded-xl border-white/10 px-4 text-white/60 hover:bg-white/5 hover:text-white sm:h-12 sm:rounded-2xl sm:px-8"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          className="h-10 gap-2 rounded-xl bg-white/10 px-6 text-white hover:bg-white/20 sm:h-12 sm:gap-3 sm:rounded-2xl sm:px-8"
        >
          {currentSlideIndex === slides.length - 1 ? "Finish" : "Next Slide"}
          <ChevronRight className="size-4 sm:size-5" />
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
  visualUrl,
}: {
  type: string;
  description: string;
  visualUrl?: string;
}) {
  if (visualUrl) {
    return (
      <div className="relative flex h-full w-full items-center justify-center p-2 sm:p-4 md:p-6">
        <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-50" />
        <Image
          src={visualUrl}
          alt={description}
          className="animate-in fade-in z-10 h-full w-full rounded-2xl border border-white/10 object-cover shadow-2xl duration-1000"
          width={1000}
          height={1000}
        />
      </div>
    );
  }

  // Simple CSS/SVG diagrams based on slide type as fallback
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
