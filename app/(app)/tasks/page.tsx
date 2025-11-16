"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Plus, Filter, Calendar, List, CheckCircle, Clock, AlertCircle, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { AddTaskModal } from "@/components/tasks/add-task-modal";
import { TaskFilters } from "@/components/tasks/task-filters";
import { CalendarView } from "@/components/tasks/calendar-view";
import { StatsCard } from "@/components/charts/stats-card";
import { TimelineChart, type TimelineData } from "@/components/charts/timeline-chart";
import { DeadlineCalendar } from "@/components/charts/deadline-calendar";
import { SmartTaskAssistant } from "@/components/ai/smart-task-assistant";
import { apiClient, type Task } from "@/lib/api/client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { toast } from "sonner";

function TasksPageContent() {
  const searchParams = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    studentId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    urgency?: string;
    sortBy?: string;
    showCompleted?: boolean;
  }>({});

  // Read URL parameters and apply them
  useEffect(() => {
    const urlView = searchParams.get("view");
    if (urlView === "calendar" || urlView === "list") {
      setView(urlView);
    }

    const urlFilters: {
      status?: string;
      priority?: string;
      studentId?: string;
      dueDateFrom?: string;
      dueDateTo?: string;
    } = {};

    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const studentId = searchParams.get("studentId");
    const dueDateFrom = searchParams.get("dueDateFrom");
    const dueDateTo = searchParams.get("dueDateTo");

    if (status) urlFilters.status = status;
    if (priority) urlFilters.priority = priority;
    if (studentId) urlFilters.studentId = studentId;
    if (dueDateFrom) urlFilters.dueDateFrom = dueDateFrom;
    if (dueDateTo) urlFilters.dueDateTo = dueDateTo;

    // Only update if there are URL parameters
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => apiClient.getTasks(filters),
  });

  const rawTasks = data?.data || [];

  // Client-side filtering and sorting
  const tasks = useMemo(() => {
    let filtered = [...rawTasks];
    const now = new Date();

    // Apply urgency filter
    if (filters.urgency) {
      switch (filters.urgency) {
        case 'overdue':
          filtered = filtered.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'completed');
          break;
        case 'today':
          filtered = filtered.filter(t => t.due_date && new Date(t.due_date).toDateString() === now.toDateString());
          break;
        case 'this-week': {
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          filtered = filtered.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= weekEnd);
          break;
        }
        case 'next-week': {
          const nextWeekStart = new Date(now);
          nextWeekStart.setDate(nextWeekStart.getDate() + 7);
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
          filtered = filtered.filter(t => t.due_date && new Date(t.due_date) >= nextWeekStart && new Date(t.due_date) <= nextWeekEnd);
          break;
        }
        case 'upcoming': {
          const upcomingEnd = new Date(now);
          upcomingEnd.setDate(upcomingEnd.getDate() + 30);
          filtered = filtered.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= upcomingEnd);
          break;
        }
      }
    }

    // Hide completed unless explicitly shown
    if (!filters.showCompleted && !filters.status) {
      filtered = filtered.filter(t => t.status !== 'completed');
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'due-date';
    switch (sortBy) {
      case 'due-date':
        filtered.sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
        break;
      case 'due-date-desc':
        filtered.sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return -1;
          if (!b.due_date) return 1;
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
        });
        break;
      case 'priority-high': {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        filtered.sort((a, b) => {
          const aPrio = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
          const bPrio = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
          return aPrio - bPrio;
        });
        break;
      }
      case 'priority-low': {
        const priorityOrder = { low: 0, medium: 1, high: 2 };
        filtered.sort((a, b) => {
          const aPrio = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
          const bPrio = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
          return aPrio - bPrio;
        });
        break;
      }
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'created':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'updated':
        filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
    }

    return filtered;
  }, [rawTasks, filters]);

  // Group tasks by status
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    // Calculate next week dates
    const nextWeekStart = new Date(weekEnd);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

    // Overdue tasks (pending or in_progress with past due date)
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false;
      return new Date(t.due_date) < now;
    }).length;

    // Tasks due this week (excluding completed)
    const thisWeekTasks = tasks.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= weekStart && dueDate <= weekEnd;
    }).length;

    // Tasks due next week (excluding completed)
    const nextWeekTasks = tasks.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= nextWeekStart && dueDate <= nextWeekEnd;
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
      nextWeek: nextWeekTasks,
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
          <SmartTaskAssistant
            tasks={tasks}
            onApplyFilters={setFilters}
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

      {/* Deadline Urgency Banner */}
      {!isLoading && !error && (stats.overdue > 0 || stats.thisWeek > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">Deadline Alert</h3>
              <p className="text-sm text-amber-800">
                {stats.overdue > 0 && `${stats.overdue} overdue task${stats.overdue !== 1 ? 's' : ''}`}
                {stats.overdue > 0 && stats.thisWeek > 0 && ', '}
                {stats.thisWeek > 0 && `${stats.thisWeek} due this week`}
                {stats.nextWeek > 0 && `, ${stats.nextWeek} due next week`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {!isLoading && !error && tasks.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          <StatsCard
            title="Total Tasks"
            value={stats.total}
            icon={ListTodo}
            iconColor="text-blue-600"
            description="All tasks in system"
          />
          <StatsCard
            title="Overdue"
            value={stats.overdue}
            icon={AlertCircle}
            iconColor="text-red-600"
            description="Tasks past due date"
          />
          <StatsCard
            title="Due This Week"
            value={stats.thisWeek}
            icon={Clock}
            iconColor="text-amber-600"
            description="Pending this week"
          />
          <StatsCard
            title="Due Next Week"
            value={stats.nextWeek}
            icon={Calendar}
            iconColor="text-purple-600"
            description="Upcoming next week"
          />
          <StatsCard
            title="In Progress"
            value={stats.inProgress}
            icon={ListTodo}
            iconColor="text-orange-600"
            description="Currently working on"
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

      {/* Filters */}
      <div className="flex items-center gap-4">
        <TaskFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Active Filters */}
      {Object.values(filters).some(v => v !== undefined && v !== false) && (
        <div className="flex flex-wrap gap-2 animate-in slide-in-from-top duration-300">
          {filters.sortBy && filters.sortBy !== 'due-date' && (
            <div className="flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm text-blue-700 transition-all hover:bg-blue-100">
              <span className="text-xs font-medium">Sort:</span> {
                filters.sortBy === 'due-date-desc' ? 'Latest First' :
                filters.sortBy === 'priority-high' ? 'High Priority' :
                filters.sortBy === 'priority-low' ? 'Low Priority' :
                filters.sortBy === 'title' ? 'A-Z' :
                filters.sortBy === 'created' ? 'Recently Created' :
                filters.sortBy === 'updated' ? 'Recently Updated' :
                filters.sortBy
              }
              <button
                onClick={() => setFilters({ ...filters, sortBy: undefined })}
                className="hover:text-blue-900 transition-colors"
              >
                ×
              </button>
            </div>
          )}
          {filters.urgency && (
            <div className="flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-1.5 text-sm text-red-700 transition-all hover:bg-red-100">
              <span className="text-xs font-medium">Urgency:</span> {
                filters.urgency === 'overdue' ? 'Overdue' :
                filters.urgency === 'today' ? 'Today' :
                filters.urgency === 'this-week' ? 'This Week' :
                filters.urgency === 'next-week' ? 'Next Week' :
                'Upcoming'
              }
              <button
                onClick={() => setFilters({ ...filters, urgency: undefined })}
                className="hover:text-red-900 transition-colors"
              >
                ×
              </button>
            </div>
          )}
          {filters.status && (
            <div className="flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-sm text-purple-700 transition-all hover:bg-purple-100">
              <span className="text-xs font-medium">Status:</span> {
                filters.status.charAt(0).toUpperCase() + filters.status.slice(1).replace('_', ' ')
              }
              <button
                onClick={() => setFilters({ ...filters, status: undefined })}
                className="hover:text-purple-900 transition-colors"
              >
                ×
              </button>
            </div>
          )}
          {filters.priority && (
            <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-700 transition-all hover:bg-amber-100">
              <span className="text-xs font-medium">Priority:</span> {
                filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)
              }
              <button
                onClick={() => setFilters({ ...filters, priority: undefined })}
                className="hover:text-amber-900 transition-colors"
              >
                ×
              </button>
            </div>
          )}
          {(filters.dueDateFrom || filters.dueDateTo) && (
            <div className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-sm text-green-700 transition-all hover:bg-green-100">
              <span className="text-xs font-medium">Due:</span>
              {filters.dueDateFrom && format(new Date(filters.dueDateFrom), 'MMM d')}
              {filters.dueDateFrom && filters.dueDateTo && ' - '}
              {filters.dueDateTo && format(new Date(filters.dueDateTo), 'MMM d, yyyy')}
              <button
                onClick={() => setFilters({ ...filters, dueDateFrom: undefined, dueDateTo: undefined })}
                className="hover:text-green-900 transition-colors"
              >
                ×
              </button>
            </div>
          )}
          {filters.showCompleted && (
            <div className="flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-sm text-indigo-700 transition-all hover:bg-indigo-100">
              <span className="text-xs font-medium">Showing completed tasks</span>
              <button
                onClick={() => setFilters({ ...filters, showCompleted: false })}
                className="hover:text-indigo-900 transition-colors"
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
                    {pendingTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="animate-in slide-in-from-left duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TaskCard task={task} />
                      </div>
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
                    {inProgressTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="animate-in slide-in-from-left duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TaskCard task={task} />
                      </div>
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
                    {completedTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="animate-in slide-in-from-left duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TaskCard task={task} />
                      </div>
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

      {/* Floating Action Button - shown in both list and calendar views */}
      {!isLoading && !error && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-8 right-8 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group animate-in zoom-in-50 slide-in-from-bottom-4 animate-bounce-slow"
          aria-label="Add new task"
          title="Add new task"
        >
          <Plus className="h-6 w-6 transition-transform group-hover:rotate-90 duration-300" />
          <span className="absolute inset-0 rounded-full bg-primary opacity-0 group-hover:opacity-20 group-hover:animate-ping"></span>
        </button>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <TasksPageContent />
    </Suspense>
  );
}

