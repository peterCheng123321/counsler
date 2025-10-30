"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary",
  trend,
  className = "",
}: StatsCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-text-primary mb-1">{value}</p>
          {description && (
            <p className="text-xs text-text-tertiary">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-semibold ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-text-tertiary">vs last month</span>
            </div>
          )}
        </div>
        <div
          className={`rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-3 ${iconColor}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
    </div>
  );
}
