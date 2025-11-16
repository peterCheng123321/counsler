"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InsightCard } from "./insight-card";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface InsightsPanelProps {
  category?: string;
  limit?: number;
}

export function InsightsPanel({ category, limit = 5 }: InsightsPanelProps) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: insights, isLoading } = useQuery({
    queryKey: ["insights", category],
    queryFn: async () => {
      const url = new URL("/api/v1/agent/insights", window.location.origin);
      if (category) url.searchParams.set("category", category);
      if (limit) url.searchParams.set("limit", limit.toString());

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch insights");
      const result = await response.json();
      return result.insights || [];
    },
    // NO AUTO-REFRESH - manual only
  });

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/v1/agent/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category || "all",
          maxInsights: limit,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          toast.warning("Rate Limit", {
            description: error.message || "Please wait before generating new insights",
          });
          return;
        }
        throw new Error(error.message || "Failed to generate insights");
      }

      const result = await response.json();
      toast.success(`Generated ${result.count} new insights`, {
        description: `Completed in ${result.generationTime}`,
      });

      // Refresh insights list
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    } catch (error) {
      console.error("Error generating insights:", error);
      toast.error("Failed to generate insights", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/agent/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });

      if (!response.ok) throw new Error("Failed to dismiss insight");

      toast.success("Insight dismissed");
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    } catch (error) {
      console.error("Error dismissing insight:", error);
      toast.error("Failed to dismiss insight");
    }
  };

  const handleAct = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/agent/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acted_on" }),
      });

      if (!response.ok) throw new Error("Failed to update insight");

      toast.success("Marked as done");
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    } catch (error) {
      console.error("Error updating insight:", error);
      toast.error("Failed to update insight");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Sparkles className="h-12 w-12 text-text-tertiary mb-3" />
        <p className="text-text-secondary mb-4">
          No AI insights yet. Generate personalized recommendations based on your current data.
        </p>
        <Button onClick={handleGenerateInsights} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing Data...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Insights
            </>
          )}
        </Button>
      </div>
    );
  }

  // Get most recent insight timestamp for "last updated" display
  const latestInsight = insights.reduce((latest: any, current: any) => {
    if (!latest) return current;
    return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
  }, null);

  const lastUpdated = latestInsight
    ? formatDistanceToNow(new Date(latestInsight.created_at), { addSuffix: true })
    : "Never";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
        <span>Last updated: {lastUpdated}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerateInsights}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>
      {insights.map((insight: any) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          onDismiss={handleDismiss}
          onAct={handleAct}
        />
      ))}
    </div>
  );
}
