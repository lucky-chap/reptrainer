import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoachingInsight } from "@/lib/analytics-utils";
import { Lightbulb, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CoachingInsightsProps {
  insights: CoachingInsight[];
}

export function CoachingInsights({ insights }: CoachingInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Lightbulb className="text-primary h-5 w-5" />
        Coaching Insights
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, idx) => (
          <Card
            key={idx}
            className="flex h-full flex-col overflow-hidden border-l-4 transition-all hover:shadow-md"
            style={{
              borderLeftColor:
                insight.type === "needs_coaching" ||
                insight.type === "team_weakness"
                  ? "oklch(0.58 0.22 27)"
                  : insight.type === "improvement"
                    ? "var(--primary)"
                    : "oklch(0.79 0.16 75)",
            }}
          >
            <CardHeader className="pb-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="bg-muted/50 rounded-full p-1.5">
                  {insight.type === "needs_coaching" ||
                  insight.type === "team_weakness" ? (
                    <AlertTriangle className="text-destructive h-4 w-4" />
                  ) : insight.type === "improvement" ? (
                    <TrendingUp className="text-primary h-4 w-4" />
                  ) : (
                    <Target className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="px-1.5 py-0 text-[10px] font-medium tracking-wider uppercase"
                >
                  {insight.user}
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold tracking-tight">
                {insight.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between pt-0">
              <p className="text-muted-foreground mb-4 line-clamp-2 text-xs">
                {insight.explanation}
              </p>
              <div className="bg-muted/30 border-muted/50 group hover:bg-muted/50 mt-auto rounded-lg border p-2.5 transition-colors">
                <div className="flex items-start gap-2">
                  <Lightbulb className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
                  <div className="text-[11px] leading-snug">
                    <span className="mb-0.5 block text-[10px] font-bold tracking-wide uppercase opacity-60">
                      Recommendation
                    </span>
                    {insight.recommendation}
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
