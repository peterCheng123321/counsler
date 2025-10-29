"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Filter, Calendar, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { AddTaskModal } from "@/components/tasks/add-task-modal";
import { TaskFilters } from "@/components/tasks/task-filters";
import { CalendarView } from "@/components/tasks/calendar-view";
import { apiClient, type Task } from "@/lib/api/client";
import { format } from "date-fns";

export default function TasksPage() {
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

  const tasks = data?.data || [];

  // Group tasks by status
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

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

