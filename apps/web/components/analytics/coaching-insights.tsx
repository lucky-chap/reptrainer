import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoachingInsight } from "@/lib/analytics-utils";
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  Users,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CoachingInsightsProps {
  insights: CoachingInsight[];
}

export function CoachingInsights({ insights }: CoachingInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Coaching Insights
        </h2>
        <Badge variant="outline" className="text-xs font-normal">
          {insights.length} {insights.length === 1 ? "Insight" : "Insights"}{" "}
          Detected
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, idx) => (
          <Card
            key={idx}
            className={cn(
              "flex h-full flex-col overflow-hidden border-l-4 transition-all hover:shadow-md",
              insight.type === "needs_coaching" && "border-l-amber-500",
              insight.type === "improvement" && "border-l-emerald-500",
              insight.type === "team_weakness" && "border-l-rose-500",
              insight.type === "skill_avoidance" && "border-l-blue-500",
            )}
          >
            <CardHeader className="pb-2">
              <div className="mb-2 flex items-center justify-between">
                <div
                  className={cn(
                    "rounded-full p-1.5",
                    insight.type === "needs_coaching" &&
                      "bg-amber-100 text-amber-600",
                    insight.type === "improvement" &&
                      "bg-emerald-100 text-emerald-600",
                    insight.type === "team_weakness" &&
                      "bg-rose-100 text-rose-600",
                    insight.type === "skill_avoidance" &&
                      "bg-blue-100 text-blue-600",
                  )}
                >
                  {insight.type === "needs_coaching" && (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {insight.type === "improvement" && (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  {insight.type === "team_weakness" && (
                    <Users className="h-4 w-4" />
                  )}
                  {insight.type === "skill_avoidance" && (
                    <Target className="h-4 w-4" />
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 px-1.5 py-0 text-[10px] font-bold tracking-wider uppercase",
                    insight.priority > 7
                      ? "border-rose-100 bg-rose-50 text-rose-700"
                      : "bg-gray-50 text-gray-600",
                  )}
                >
                  {insight.user}
                </Badge>
              </div>
              <CardTitle className="text-sm leading-tight font-bold">
                {insight.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between pt-0">
              <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
                {insight.explanation}
              </p>
              <div className="bg-muted/30 border-muted/50 group hover:bg-muted/50 mt-auto rounded-lg border p-2.5 transition-colors">
                <div className="flex items-start gap-2">
                  <Lightbulb className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
                  <div className="text-[11px] leading-snug">
                    <span className="mb-0.5 block text-[10px] font-bold tracking-wide uppercase opacity-60">
                      Recommendation
                    </span>
                    <span className="text-foreground italic">
                      {insight.recommendation}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
