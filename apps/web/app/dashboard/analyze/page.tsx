"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileAudio,
  ShieldCheck,
  Zap,
  Clock,
  ChevronRight,
  History,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CallUpload } from "@/components/call-upload";
import { useAuth } from "@/context/auth-context";
import { useTeam } from "@/context/team-context";
import { subscribeSessions } from "@/lib/db";
import type { Session } from "@/lib/db";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function AnalyzePage() {
  const { user } = useAuth();
  const { memberships, isAdmin } = useTeam();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const teamIds = useMemo(() => memberships.map((m) => m.id), [memberships]);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeSessions(
      user.uid,
      isAdmin ? teamIds : [],
      (data) => {
        // Filter for external calls only
        const externalCalls = data
          .filter((s) => s.source === "external")
          .slice(0, 5);
        setSessions(externalCalls);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching sessions:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user, isAdmin, teamIds]);

  return (
    <div className="animate-fade-up space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          asChild
          variant="ghost"
          className="text-warm-gray hover:text-charcoal -ml-4 w-fit gap-2 transition-colors"
        >
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <span className="text-warm-gray mb-2 block text-xs font-medium tracking-widest uppercase">
            External Analysis
          </span>
          <h1 className="heading-serif text-charcoal text-3xl md:text-4xl lg:text-5xl">
            Analyze <em>Recordings.</em>
          </h1>
          <p className="text-warm-gray mt-2 max-w-2xl text-base">
            Upload your real-world sales calls for deep AI analysis. Get
            structured transcripts, performance scoring, and actionable coaching
            insights.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Upload Section */}
        <Card className="border-border/60 bg-white shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Upload Call Recording</CardTitle>
            <CardDescription>
              Select an audio or video file of your sales conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center px-6 py-10">
            <CallUpload
              inline
              onUploadComplete={(id) => {
                window.location.href = `/dashboard/history/${id}`;
              }}
            />
            <p className="text-warm-gray mt-6 text-center text-xs">
              Supported formats: MP3, WAV, M4A, MP4, MOV. Max size: 50MB.
            </p>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-cream/30 shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Zap className="text-charcoal size-4" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="bg-charcoal text-cream flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  1
                </div>
                <p className="text-charcoal/80 text-xs">
                  Upload your recording file.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="bg-charcoal text-cream flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  2
                </div>
                <p className="text-charcoal/80 text-xs">
                  Gemini Pro transcribes the conversation with speaker
                  diarization.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="bg-charcoal text-cream flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  3
                </div>
                <p className="text-charcoal/80 text-xs">
                  The AI evaluates your performance across 5 core sales
                  competencies.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-white shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="size-4 text-green-600" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-warm-gray text-xs leading-relaxed">
                Your recordings are processed securely and used only for your
                team's coaching. We use enterprise-grade encryption and do not
                use your data to train public models.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Analyses Section */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-charcoal flex items-center gap-2 text-xl font-bold">
              <History className="size-5" />
              Recent Analyses
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-warm-gray hover:text-charcoal"
            >
              <Link href="/dashboard/history">View All History</Link>
            </Button>
          </div>
          <div className="grid gap-4">
            {sessions.map((session, i) => (
              <div
                key={session.id}
                onClick={() => router.push(`/dashboard/history/${session.id}`)}
                className="border-border/60 hover:shadow-charcoal/5 group animate-fade-up cursor-pointer rounded-2xl border bg-white p-6 transition-all duration-300 hover:shadow-lg"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-charcoal/5 text-charcoal flex size-12 items-center justify-center rounded-xl">
                      <FileAudio className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-charcoal font-bold">
                        {session.userName || "External Call"}
                      </h3>
                      <div className="text-warm-gray mt-1 flex items-center gap-4 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {Math.floor(session.durationSeconds / 60)}m{" "}
                          {session.durationSeconds % 60}s
                        </span>
                        <span>
                          {new Date(session.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {session.evaluation?.overallScore && (
                      <Badge
                        variant="secondary"
                        className="bg-charcoal/5 text-charcoal font-bold"
                      >
                        Score: {session.evaluation.overallScore}
                      </Badge>
                    )}
                    <div className="bg-charcoal/5 flex size-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-1">
                      <ChevronRight className="text-charcoal size-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
