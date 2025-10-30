"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Users, CheckCircle2, AlertCircle } from "lucide-react";

interface ProgressStat {
  label: string;
  value: number;
  total?: number;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  color?: "success" | "warning" | "danger" | "info";
}

interface ProgressOverviewWidgetProps {
  stats: ProgressStat[];
  title?: string;
  description?: string;
}

const colorClasses = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

const TrendIcon = ({ trend }: { trend?: "up" | "down" | "stable" }) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "stable":
      return <Minus className="h-4 w-4 text-text-secondary" />;
    default:
      return null;
  }
};

export function ProgressOverviewWidget({
  stats,
  title = "Overview",
  description = "Key metrics at a glance",
}: ProgressOverviewWidgetProps) {
  if (!stats || stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-text-secondary">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, index) => {
            const percentage = stat.total
              ? Math.round((stat.value / stat.total) * 100)
              : stat.value;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{stat.label}</span>
                    {stat.trend && <TrendIcon trend={stat.trend} />}
                  </div>
                  <div className="flex items-center gap-2">
                    {stat.total ? (
                      <span className="text-sm text-text-secondary">
                        {stat.value} / {stat.total}
                      </span>
                    ) : (
                      <span className="text-sm text-text-secondary">{stat.value}%</span>
                    )}
                    {stat.trendValue && (
                      <span
                        className={`text-xs ${
                          stat.trend === "up"
                            ? "text-green-500"
                            : stat.trend === "down"
                            ? "text-red-500"
                            : "text-text-secondary"
                        }`}
                      >
                        {stat.trendValue}
                      </span>
                    )}
                  </div>
                </div>
                <Progress
                  value={percentage}
                  className={`h-2 ${stat.color ? colorClasses[stat.color] : ""}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
