"use client";

import { Sparkles } from "lucide-react";
import { InsightCard } from "./insight-card";

interface Insight {
  category: string;
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
}

interface InsightsContainerProps {
  insights: Insight[];
}

export function InsightsContainer({ insights }: InsightsContainerProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-text-primary">
          AI Insights ({insights.length})
        </span>
      </div>

      {/* Insights */}
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <InsightCard key={index} insight={insight} />
        ))}
      </div>
    </div>
  );
}
