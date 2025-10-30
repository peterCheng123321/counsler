"use client";

import { AlertCircle, TrendingUp, Users, CheckCircle, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Insight {
  category: string;
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
}

interface InsightCardProps {
  insight: Insight;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  productivity: TrendingUp,
  student_progress: Users,
  trends: TrendingUp,
  deadlines: AlertCircle,
  completion: CheckCircle,
};

const priorityColors = {
  high: {
    bg: "bg-red-50 border-red-200",
    icon: "text-red-600",
    badge: "bg-red-100 text-red-700 border-red-300",
    text: "text-red-900",
  },
  medium: {
    bg: "bg-amber-50 border-amber-200",
    icon: "text-amber-600",
    badge: "bg-amber-100 text-amber-700 border-amber-300",
    text: "text-amber-900",
  },
  low: {
    bg: "bg-blue-50 border-blue-200",
    icon: "text-blue-600",
    badge: "bg-blue-100 text-blue-700 border-blue-300",
    text: "text-blue-900",
  },
};

export function InsightCard({ insight }: InsightCardProps) {
  const Icon = categoryIcons[insight.category] || Lightbulb;
  const colors = priorityColors[insight.priority];

  // Format category for display
  const categoryDisplay = insight.category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <Card
      className={`border p-4 transition-all duration-300 hover:shadow-md ${colors.bg}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 ${colors.icon}`}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          {/* Header with category and priority */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">
              {categoryDisplay}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors.badge}`}
            >
              {insight.priority.charAt(0).toUpperCase() +
                insight.priority.slice(1)} Priority
            </span>
          </div>

          {/* Finding */}
          <div className={`text-sm ${colors.text}`}>
            <span className="font-medium">Finding: </span>
            {insight.finding}
          </div>

          {/* Recommendation */}
          <div className="text-sm text-text-secondary">
            <span className="font-medium">Recommendation: </span>
            {insight.recommendation}
          </div>
        </div>
      </div>
    </Card>
  );
}
