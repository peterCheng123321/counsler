"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Mail,
  ExternalLink,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Insight {
  id: string;
  category: string;
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
  created_at: string;
  // Optional metadata
  affected_count?: number;
  related_data?: {
    student_ids?: string[];
    task_ids?: string[];
    deadline_date?: string;
  };
}

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (id: string) => void;
  onAct?: (id: string) => void;
}

export function InsightCard({ insight, onDismiss, onAct }: InsightCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const priorityBorders = {
    high: "border-l-4 border-l-red-500",
    medium: "border-l-4 border-l-amber-500",
    low: "border-l-4 border-l-blue-500",
  };

  const categoryIcons = {
    deadline: AlertCircle,
    progress: TrendingUp,
    recommendation: Lightbulb,
    risk: AlertCircle,
    success: CheckCircle2,
    student: Users,
  };

  const Icon =
    categoryIcons[insight.category as keyof typeof categoryIcons] || Lightbulb;

  // Smart actions based on category
  const getSmartActions = () => {
    const actions: Array<{
      label: string;
      icon: any;
      onClick: () => void;
      variant?: "default" | "outline" | "secondary";
    }> = [];

    switch (insight.category) {
      case "deadline":
        actions.push({
          label: "View Tasks",
          icon: Calendar,
          onClick: () => router.push("/tasks"),
          variant: "outline",
        });
        actions.push({
          label: "View Calendar",
          icon: Clock,
          onClick: () => router.push("/tasks?view=calendar"),
          variant: "outline",
        });
        break;

      case "student":
        actions.push({
          label: "View Students",
          icon: Users,
          onClick: () => router.push("/students"),
          variant: "outline",
        });
        if (insight.finding.includes("high-achieving") || insight.finding.includes("GPA")) {
          actions.push({
            label: "Filter High Achievers",
            icon: TrendingUp,
            onClick: () => router.push("/students?progressMin=70"),
            variant: "outline",
          });
        }
        break;

      case "progress":
        actions.push({
          label: "View Progress",
          icon: BarChart3,
          onClick: () => router.push("/students"),
          variant: "outline",
        });
        break;

      case "risk":
        actions.push({
          label: "View At-Risk Students",
          icon: AlertCircle,
          onClick: () => router.push("/students?progressMax=30"),
          variant: "outline",
        });
        actions.push({
          label: "Schedule Meetings",
          icon: Calendar,
          onClick: () => router.push("/tasks"),
          variant: "outline",
        });
        break;

      case "success":
        actions.push({
          label: "View Top Performers",
          icon: CheckCircle2,
          onClick: () => router.push("/students?progressMin=90"),
          variant: "outline",
        });
        break;

      case "recommendation":
        actions.push({
          label: "View Details",
          icon: ExternalLink,
          onClick: () => setIsExpanded(!isExpanded),
          variant: "outline",
        });
        break;
    }

    return actions;
  };

  const smartActions = getSmartActions();

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-200",
        priorityBorders[insight.priority],
        isExpanded && "shadow-lg"
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "rounded-full p-2 shrink-0",
                insight.priority === "high" && "bg-red-100",
                insight.priority === "medium" && "bg-amber-100",
                insight.priority === "low" && "bg-blue-100"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  insight.priority === "high" && "text-red-600",
                  insight.priority === "medium" && "text-amber-600",
                  insight.priority === "low" && "text-blue-600"
                )}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge
                  className={cn(priorityColors[insight.priority], "border")}
                >
                  {insight.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {insight.category}
                </Badge>
                {insight.affected_count && (
                  <Badge variant="secondary" className="text-xs">
                    {insight.affected_count} affected
                  </Badge>
                )}
                <span className="text-xs text-text-tertiary ml-auto">
                  {formatDistanceToNow(new Date(insight.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {/* Finding - Always visible */}
              <p className="font-semibold text-sm text-text-primary mb-2">
                {insight.finding}
              </p>

              {/* Recommendation - Collapsible */}
              {!isExpanded && (
                <p className="text-sm text-text-secondary line-clamp-2">
                  {insight.recommendation}
                </p>
              )}

              {isExpanded && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                      Recommendation
                    </p>
                    <p className="text-sm text-text-secondary">
                      {insight.recommendation}
                    </p>
                  </div>

                  {/* Related Data */}
                  {insight.related_data && (
                    <div className="space-y-2">
                      {insight.related_data.student_ids &&
                        insight.related_data.student_ids.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-text-tertiary">
                            <Users className="h-3 w-3" />
                            <span>
                              {insight.related_data.student_ids.length} students
                              affected
                            </span>
                          </div>
                        )}
                      {insight.related_data.task_ids &&
                        insight.related_data.task_ids.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-text-tertiary">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {insight.related_data.task_ids.length} tasks
                              related
                            </span>
                          </div>
                        )}
                      {insight.related_data.deadline_date && (
                        <div className="flex items-center gap-2 text-xs text-text-tertiary">
                          <Clock className="h-3 w-3" />
                          <span>
                            Deadline:{" "}
                            {new Date(
                              insight.related_data.deadline_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {/* Expand/Collapse */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-7 text-xs"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show More
                    </>
                  )}
                </Button>

                {/* Smart Actions */}
                {smartActions.slice(0, 2).map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={action.variant || "outline"}
                    onClick={action.onClick}
                    className="h-7 text-xs"
                  >
                    <action.icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                ))}

                {/* Mark Done */}
                {onAct && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAct(insight.id)}
                    className="h-7 text-xs ml-auto"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Mark Done
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Dismiss Button */}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(insight.id)}
              className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
