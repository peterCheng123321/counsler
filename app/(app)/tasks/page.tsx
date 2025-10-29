"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Filter, Calendar, List, Sparkles, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "@/components/tasks/task-card";
import { AddTaskModal } from "@/components/tasks/add-task-modal";
import { TaskFilters } from "@/components/tasks/task-filters";
import { CalendarView } from "@/components/tasks/calendar-view";
import { apiClient, type Task } from "@/lib/api/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AISuggestion {
  id: string;
  suggestion_type: string;
  suggestion_text: string;
  priority: string;
  student_id?: string;
  metadata?: any;
}

export default function TasksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    studentId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => apiClient.getTasks(filters),
  });

  // Fetch AI task suggestions
  const { data: suggestionsData, refetch: refetchSuggestions } = useQuery({
    queryKey: ["ai-task-suggestions"],
    queryFn: async () => {
      const response = await fetch("/api/v1/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          module: "task_efficiency",
        }),
      });
      if (!response.ok) return null;
      
      // Generate suggestions based on analysis
      const analysis = await response.json();
      return generateSuggestions(analysis.data);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => apiClient.createTask(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ai-task-suggestions"] });
      toast({
        title: "Task created",
        description: "Task has been created successfully.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "error",
      });
    },
  });

  const tasks = data?.data || [];
  const suggestions: AISuggestion[] = suggestionsData || [];

  // Group tasks by status
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    const taskData = {
      title: suggestion.suggestion_text,
      description: `AI-suggested: ${suggestion.suggestion_type}`,
      priority: suggestion.priority || "medium",
      studentId: suggestion.student_id || undefined,
      dueDate: suggestion.metadata?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    };

    createTaskMutation.mutate(taskData);
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    // For now, just refetch to regenerate suggestions
    // In the future, this could mark suggestions as dismissed in the database
    refetchSuggestions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary">Tasks</h1>
          <p className="text-body text-text-secondary mt-1">
            Manage your tasks and track deadlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-background p-1">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <TaskFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* AI Suggestions Panel */}
      {suggestions.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 via-primary/3 to-blue-50 dark:from-primary/10 dark:via-primary/5 dark:to-blue-950/20 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <h2 className="text-lg font-semibold text-text-primary">
                AI Task Suggestions
              </h2>
              <Badge variant="outline" className="text-xs">
                {suggestions.length} new
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchSuggestions()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-surface/50 border border-border/50 hover:border-primary/50 transition-all"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {suggestion.suggestion_text}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {suggestion.suggestion_type.replace("_", " ")}
                    </Badge>
                    <Badge
                      variant={
                        suggestion.priority === "high"
                          ? "destructive"
                          : suggestion.priority === "medium"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {suggestion.priority}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    disabled={createTaskMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissSuggestion(suggestion.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active Filters */}
      {(filters.status ||
        filters.priority ||
        filters.studentId ||
        filters.dueDateFrom ||
        filters.dueDateTo) && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <div className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-sm text-primary-dark">
              Status: {filters.status}
              <button
                onClick={() => setFilters({ ...filters, status: undefined })}
                className="hover:text-primary"
              >
                ×
              </button>
            </div>
          )}
          {filters.priority && (
            <div className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-sm text-primary-dark">
              Priority: {filters.priority}
              <button
                onClick={() => setFilters({ ...filters, priority: undefined })}
                className="hover:text-primary"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-surface border border-border"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-error bg-error-light p-4">
          <p className="text-error font-semibold mb-2">Failed to load tasks</p>
          <p className="text-body-sm text-text-secondary mb-4">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Tasks List View */}
      {!isLoading && !error && view === "list" && (
        <>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface p-12">
              <div className="text-text-tertiary mb-4">
                <List className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-heading-3 mb-2 text-text-primary">
                No tasks found
              </h3>
              <p className="text-body text-text-secondary mb-6 text-center">
                Get started by creating your first task.
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div>
                  <h2 className="text-heading-3 mb-4 font-semibold text-text-primary">
                    Pending ({pendingTasks.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress Tasks */}
              {inProgressTasks.length > 0 && (
                <div>
                  <h2 className="text-heading-3 mb-4 font-semibold text-text-primary">
                    In Progress ({inProgressTasks.length})
                  </h2>
                  <div className="space-y-3">
                    {inProgressTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h2 className="text-heading-3 mb-4 font-semibold text-text-primary">
                    Completed ({completedTasks.length})
                  </h2>
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Calendar View */}
      {!isLoading && !error && view === "calendar" && (
        <CalendarView 
          tasks={tasks} 
          onTaskClick={(task) => {
            // TODO: Open task detail modal or navigate to task page
            console.log("Task clicked:", task);
          }}
        />
      )}

      {/* Add Task Modal */}
      <AddTaskModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}

// Helper function to generate suggestions from analysis
function generateSuggestions(analysis: any): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  
  if (!analysis) return suggestions;

  // Generate suggestions based on task efficiency analysis
  if (analysis.overdueTasks > 0) {
    suggestions.push({
      id: "suggestion-1",
      suggestion_type: "review_overdue",
      suggestion_text: `Review ${analysis.overdueTasks} overdue task${analysis.overdueTasks > 1 ? "s" : ""}`,
      priority: "high",
    });
  }

  if (analysis.onTimeRate < 70) {
    suggestions.push({
      id: "suggestion-2",
      suggestion_type: "improve_efficiency",
      suggestion_text: "Consider breaking down large tasks into smaller ones",
      priority: "medium",
    });
  }

  // Add more intelligent suggestions based on patterns
  return suggestions.slice(0, 5); // Limit to 5 suggestions
}
