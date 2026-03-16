import { Card } from "@/components/ui/card";
import { CoachingInsight } from "@/lib/analytics-utils";
import type { RAGCoachingInsight } from "@reptrainer/shared";
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  Users,
  Target,
  BookOpen,
  Shield,
  RefreshCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AnyInsight = CoachingInsight | RAGCoachingInsight;

interface CoachingInsightsProps {
  insights: AnyInsight[];
  loading?: boolean;
  onGenerate?: () => void;
  canGenerate?: boolean;
  milestone?: number;
}

function getInsightStyles(type: string) {
  switch (type) {
    case "needs_coaching":
      return {
        hover: "hover:border-amber-200/50",
        bar: "bg-amber-500/50",
        icon: "border-amber-100 bg-amber-50 text-amber-600",
        Icon: AlertCircle,
      };
    case "improvement":
      return {
        hover: "hover:border-emerald-200/50",
        bar: "bg-emerald-500/50",
        icon: "border-emerald-100 bg-emerald-50 text-emerald-600",
        Icon: TrendingUp,
      };
    case "team_weakness":
      return {
        hover: "hover:border-rose-200/50",
        bar: "bg-rose-500/50",
        icon: "border-rose-100 bg-rose-50 text-rose-600",
        Icon: Users,
      };
    case "skill_avoidance":
      return {
        hover: "hover:border-blue-200/50",
        bar: "bg-blue-500/50",
        icon: "border-blue-100 bg-blue-50 text-blue-600",
        Icon: Target,
      };
    case "product_gap":
      return {
        hover: "hover:border-purple-200/50",
        bar: "bg-purple-500/50",
        icon: "border-purple-100 bg-purple-50 text-purple-600",
        Icon: BookOpen,
      };
    case "competitive_edge":
      return {
        hover: "hover:border-teal-200/50",
        bar: "bg-teal-500/50",
        icon: "border-teal-100 bg-teal-50 text-teal-600",
        Icon: Shield,
      };
    default:
      return {
        hover: "",
        bar: "bg-gray-500/50",
        icon: "border-gray-100 bg-gray-50 text-gray-600",
        Icon: Lightbulb,
      };
  }
}

export function CoachingInsights({
  insights,
  loading,
  onGenerate,
  canGenerate,
  milestone,
}: CoachingInsightsProps) {
  // Always show the header if we have a milestone or a team context
  // This ensures the user knows insights are coming

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Coaching Insights
        </h2>
        <div className="flex items-center gap-3">
          {onGenerate && canGenerate && !loading && (
            <Button
              onClick={onGenerate}
              variant="outline"
              size="sm"
              className="h-8 gap-2 border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100 hover:text-purple-800"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Generate Milestone {milestone} Insights
            </Button>
          )}
          {loading && (
            <Badge
              variant="outline"
              className="animate-pulse border-purple-200 text-xs font-normal text-purple-600"
            >
              Generating insights...
            </Badge>
          )}
          {milestone !== undefined && milestone > 0 && !loading && (
            <Badge
              variant="outline"
              className="border-purple-200 bg-purple-50 text-xs font-bold text-purple-700"
            >
              Milestone {milestone}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-normal">
            {loading ? (
              <span className="flex items-center gap-1">Analyzing...</span>
            ) : (
              <>
                {insights.length}{" "}
                {insights.length === 1 ? "Insight" : "Insights"}{" "}
                {insights.length === 0 && milestone === 0
                  ? "(Need 5+ sessions)"
                  : ""}
              </>
            )}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, idx) => {
          const styles = getInsightStyles(insight.type);
          const isRag = "source" in insight && insight.source === "rag";
          const knowledgeRefs =
            isRag && "knowledgeReferences" in insight
              ? (insight as RAGCoachingInsight).knowledgeReferences
              : undefined;

          return (
            <Card
              key={idx}
              className={cn(
                "group border-border/40 hover:border-border/80 relative flex flex-col overflow-hidden border bg-white/50 shadow-none transition-all hover:bg-white",
                styles.hover,
              )}
            >
              {/* Minimal top indicator */}
              <div className={cn("h-0.5 w-full", styles.bar)} />

              <div className="flex flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm",
                      styles.icon,
                    )}
                  >
                    <styles.Icon className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 px-1 text-[9px] font-bold tracking-tighter uppercase",
                            insight.priority > 7
                              ? "border-rose-200 bg-rose-50/50 text-rose-700"
                              : "border-gray-100 bg-gray-50/50 text-gray-500",
                          )}
                        >
                          P{insight.priority}
                        </Badge>
                        {isRag && (
                          <Badge
                            variant="outline"
                            className="h-4 border-purple-200 bg-purple-50/50 px-1 text-[9px] font-bold tracking-tighter text-purple-600 uppercase"
                          >
                            KB
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground ml-2 truncate text-[9px] font-semibold tracking-tight uppercase">
                        {insight.user}
                      </span>
                    </div>
                    <h3 className="truncate text-sm leading-tight font-bold">
                      {insight.title}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-muted-foreground line-clamp-2 text-xs leading-normal">
                    {insight.explanation}
                  </p>

                  <div className="bg-muted/30 group-hover:bg-muted/50 group-hover:border-border/50 flex items-start gap-2 rounded-lg border border-transparent p-2.5 transition-all">
                    <Lightbulb className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
                    <p className="text-foreground text-[11px] leading-snug font-medium">
                      <span className="text-primary mr-1 font-bold">Rec:</span>
                      {insight.recommendation}
                    </p>
                  </div>

                  {knowledgeRefs && knowledgeRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {knowledgeRefs.map((ref, i) => (
                        <span
                          key={i}
                          className="inline-block rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] leading-tight text-purple-600"
                        >
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {/* Loading skeletons — only show while actively generating */}
        {loading &&
          Array.from({ length: 3 }).map((_, idx) => (
            <Card
              key={`skeleton-${idx}`}
              className="border-border/40 relative flex flex-col overflow-hidden border bg-white/50 shadow-none"
            >
              <div className="h-0.5 w-full animate-pulse bg-purple-500/30" />
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-purple-50/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-16 animate-pulse rounded bg-gray-100/50" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100/50" />
                  </div>
                </div>
                <div className="h-8 w-full animate-pulse rounded bg-gray-50/50" />
                <div className="h-10 w-full animate-pulse rounded bg-gray-50/50" />
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
