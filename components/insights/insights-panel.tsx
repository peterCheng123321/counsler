"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InsightCard } from "./insight-card";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InsightsPanelProps {
  category?: string;
  limit?: number;
}

export function InsightsPanel({ category, limit = 5 }: InsightsPanelProps) {
  const queryClient = useQueryClient();

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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
        <p className="text-text-secondary">
          No insights yet. The AI assistant will analyze your data and provide
          recommendations here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
