"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  X,
} from "lucide-react";

interface Insight {
  id: string;
  category: string;
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
  created_at: string;
}

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (id: string) => void;
  onAct?: (id: string) => void;
}

export function InsightCard({ insight, onDismiss, onAct }: InsightCardProps) {
  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const categoryIcons = {
    deadline: AlertCircle,
    progress: TrendingUp,
    recommendation: Lightbulb,
    risk: AlertCircle,
    success: CheckCircle2,
  };

  const Icon =
    categoryIcons[insight.category as keyof typeof categoryIcons] || Lightbulb;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={`rounded-full p-2 ${
                insight.priority === "high"
                  ? "bg-red-100"
                  : insight.priority === "medium"
                  ? "bg-amber-100"
                  : "bg-blue-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  insight.priority === "high"
                    ? "text-red-600"
                    : insight.priority === "medium"
                    ? "text-amber-600"
                    : "text-blue-600"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${priorityColors[insight.priority]} border`}>
                  {insight.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {insight.category}
                </Badge>
              </div>

              <p className="font-semibold text-sm text-text-primary mb-1">
                {insight.finding}
              </p>
              <p className="text-sm text-text-secondary">
                {insight.recommendation}
              </p>

              <div className="flex items-center gap-2 mt-3">
                {onAct && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAct(insight.id)}
                    className="h-7 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Mark Done
                  </Button>
                )}
              </div>
            </div>
          </div>

          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(insight.id)}
              className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
