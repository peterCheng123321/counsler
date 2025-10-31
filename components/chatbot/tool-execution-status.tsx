"use client";

import { Database, Users, Calendar, CheckCircle2, TrendingUp, Lightbulb, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ToolExecutionStatusProps {
  toolName: string;
  status: "executing" | "completed" | "failed";
  compact?: boolean;
  description?: string;
  arguments?: any;
}

const TOOL_CONFIG: Record<
  string,
  { icon: any; label: string; color: string; bgColor: string }
> = {
  get_students: {
    icon: Users,
    label: "Querying students",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  get_student: {
    icon: Users,
    label: "Fetching student details",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  get_tasks: {
    icon: Calendar,
    label: "Loading tasks",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  get_task: {
    icon: Calendar,
    label: "Fetching task details",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  get_upcoming_deadlines: {
    icon: Calendar,
    label: "Checking deadlines",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  calculate_statistics: {
    icon: TrendingUp,
    label: "Calculating statistics",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  trend_analysis: {
    icon: TrendingUp,
    label: "Analyzing trends",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  deadline_monitor: {
    icon: Calendar,
    label: "Monitoring deadlines",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  generate_insights: {
    icon: Sparkles,
    label: "Generating insights",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  // Default for unknown tools
  default: {
    icon: Database,
    label: "Processing",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
};

export function ToolExecutionStatus({
  toolName,
  status,
  compact = false,
  description,
  arguments: args,
}: ToolExecutionStatusProps) {
  const config = TOOL_CONFIG[toolName] || TOOL_CONFIG.default;
  const Icon = config.icon;

  // Use custom description if available, otherwise use default label
  const displayLabel = description || config.label;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <div className={cn("rounded-full p-1", config.bgColor)}>
          {status === "executing" ? (
            <Icon className={cn("h-3 w-3 animate-pulse", config.color)} />
          ) : status === "completed" ? (
            <CheckCircle2 className="h-3 w-3 text-green-600" />
          ) : (
            <Icon className={cn("h-3 w-3", config.color)} />
          )}
        </div>
        <span className="text-xs">{displayLabel}</span>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "border px-4 py-3 shadow-sm transition-all duration-300",
        status === "executing" && "animate-pulse border-primary/30 bg-primary/5",
        status === "completed" && "border-green-200 bg-green-50/50",
        status === "failed" && "border-red-200 bg-red-50/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "rounded-lg p-2.5 transition-colors",
            status === "executing" && config.bgColor,
            status === "completed" && "bg-green-100",
            status === "failed" && "bg-red-100"
          )}
        >
          {status === "executing" ? (
            <Icon className={cn("h-4 w-4 animate-spin", config.color)} />
          ) : status === "completed" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Icon className={cn("h-4 w-4", config.color)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {status === "executing" && displayLabel}
            {status === "completed" && `${displayLabel} - Complete`}
            {status === "failed" && `${displayLabel} - Failed`}
          </p>
          {/* Show default label as subtitle if custom description exists */}
          {description && status === "executing" && (
            <p className="text-xs text-text-tertiary mt-0.5">{config.label}</p>
          )}
          {status === "executing" && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  config.color.replace("text-", "bg-")
                )}
                style={{
                  width: "60%",
                  animation: "loading-pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Animated loading component for multiple tools
interface ToolExecutionListProps {
  tools: Array<{
    name: string;
    status: "executing" | "completed" | "failed";
    description?: string;
    arguments?: any;
  }>;
}

export function ToolExecutionList({ tools }: ToolExecutionListProps) {
  if (tools.length === 0) return null;

  return (
    <div className="space-y-2 my-4 animate-fade-in">
      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse"></span>
        Agent Activity
      </p>
      <div className="space-y-2">
        {tools.map((tool, index) => (
          <ToolExecutionStatus
            key={`${tool.name}-${index}`}
            toolName={tool.name}
            status={tool.status}
            description={tool.description}
            arguments={tool.arguments}
          />
        ))}
      </div>
    </div>
  );
}
