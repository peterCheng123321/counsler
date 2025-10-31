"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Filter, Calendar, List, CheckCircle, Clock, AlertCircle, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { AddTaskModal } from "@/components/tasks/add-task-modal";
import { TaskFilters } from "@/components/tasks/task-filters";
import { CalendarView } from "@/components/tasks/calendar-view";
import { StatsCard } from "@/components/charts/stats-card";
import { TimelineChart, type TimelineData } from "@/components/charts/timeline-chart";
import { DeadlineCalendar } from "@/components/charts/deadline-calendar";
import { QuickAIButton } from "@/components/ai/quick-ai-button";
import { InsightsPanel } from "@/components/insights/insights-panel";
import { apiClient, type Task } from "@/lib/api/client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { toast } from "sonner";

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

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    // Overdue tasks (pending or in_progress with past due date)
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false;
      return new Date(t.due_date) < now;
    }).length;

    // Tasks due this week
    const thisWeekTasks = tasks.filter((t) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= weekStart && dueDate <= weekEnd;
    }).length;

    // Weekly timeline data
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const timelineData: TimelineData[] = weekDays.map((day) => {
      const dayTasks = tasks.filter((t) => {
        if (!t.due_date) return false;
        return isSameDay(new Date(t.due_date), day);
      });

      return {
        name: format(day, "EEE"),
        pending: dayTasks.filter((t) => t.status === "pending").length,
        inProgress: dayTasks.filter((t) => t.status === "in_progress").length,
        completed: dayTasks.filter((t) => t.status === "completed").length,
      };
    });

    return {
      total: tasks.length,
      pending: pendingTasks.length,
      inProgress: inProgressTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks,
      thisWeek: thisWeekTasks,
      timelineData,
    };
  }, [tasks, pendingTasks, inProgressTasks, completedTasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary">Tasks</h1>
          <p className="text-body text-text-secondary mt-1">
            Manage your tasks and track deadlines
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuickAIButton
            suggestions={[
              {
                label: "What should I focus on today?",
                prompt: "Based on my current tasks, what should I prioritize today?",
              },
              {
                label: "Show overdue tasks",
                prompt: "Which tasks are overdue and need immediate attention?",
              },
              {
                label: "Weekly task summary",
                prompt: "Give me a summary of tasks for this week",
              },
              {
                label: "Suggest task priorities",
                prompt: "Analyze my tasks and suggest which ones should be higher priority",
              },
            ]}
            onSelect={(prompt, response) => {
              toast.info("AI Response", { description: response });
            }}
          />
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

      {/* Statistics Cards */}
      {!isLoading && !error && tasks.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <StatsCard
            title="Total Tasks"
            value={stats.total}
            icon={ListTodo}
            iconColor="text-blue-600"
            description="All tasks in system"
          />
          <StatsCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            iconColor="text-orange-600"
            description="Tasks awaiting action"
          />
          <StatsCard
            title="Overdue"
            value={stats.overdue}
            icon={AlertCircle}
            iconColor="text-red-600"
            description="Tasks past due date"
          />
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle}
            iconColor="text-green-600"
            description="Successfully finished"
          />
        </div>
      )}

      {/* Charts */}
      {!isLoading && !error && tasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <TimelineChart
              data={stats.timelineData}
              title="This Week's Task Timeline"
            />
          </div>
          <DeadlineCalendar
            deadlines={tasks
              .filter((t) => t.due_date && t.status !== "completed")
              .map((t) => ({
                id: t.id,
                title: t.title,
                dueDate: t.due_date!,
                priority: (t.priority as "high" | "medium" | "low") || "medium",
                status: t.status,
                studentName: t.students ? `${t.students.first_name} ${t.students.last_name}` : undefined,
              }))
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .slice(0, 10)}
            title="Upcoming Deadlines"
            description="Next 10 pending tasks"
            daysAhead={14}
          />
        </div>
      )}

      {/* AI Insights */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-heading-3 font-semibold text-text-primary mb-4">
          AI Insights
        </h2>
        <InsightsPanel category="deadline" limit={5} />
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

      {/* Floating Action Button - only shown in list view with tasks */}
      {!isLoading && !error && view === "list" && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-8 right-8 z-50 h-14 w-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group"
          aria-label="Add new task"
          title="Add new task"
        >
          <Plus className="h-6 w-6 transition-transform group-hover:rotate-90 duration-300" />
        </button>
      )}
    </div>
  );
}

