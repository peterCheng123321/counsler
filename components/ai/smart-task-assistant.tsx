"use client";

import { useState } from "react";
import { Sparkles, Loader2, Zap, TrendingUp, Calendar, ListChecks, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Task } from "@/lib/api/client";

interface SmartTaskAssistantProps {
  tasks: Task[];
  onApplyFilters?: (filters: any) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

type AIAction =
  | "focus-today"
  | "prioritize"
  | "overdue-analysis"
  | "deadline-suggestions"
  | "weekly-plan";

interface AIInsight {
  action: AIAction;
  title: string;
  description: string;
  tasks?: Task[];
  suggestions?: any[];
  filterConfig?: any;
}

export function SmartTaskAssistant({
  tasks,
  onApplyFilters,
  variant = "outline",
  size = "sm",
}: SmartTaskAssistantProps) {
  const [open, setOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [insight, setInsight] = useState<AIInsight | null>(null);

  // Smart analysis functions
  const analyzeFocusToday = (): AIInsight => {
    const now = new Date();
    const today = now.toDateString();

    // Get tasks due today or overdue, excluding completed
    const urgentTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;

      const dueDate = new Date(t.due_date);
      return dueDate.toDateString() === today || dueDate < now;
    });

    // Sort by priority (high first) then due date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const focusTasks = urgentTasks
      .sort((a, b) => {
        const aPrio = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
        const bPrio = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
        if (aPrio !== bPrio) return aPrio - bPrio;
        return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
      })
      .slice(0, 5); // Top 5 tasks

    return {
      action: "focus-today",
      title: "Today's Focus Tasks",
      description: `AI identified ${focusTasks.length} critical tasks that need your attention today.`,
      tasks: focusTasks,
      filterConfig: { urgency: 'today', sortBy: 'priority-high' },
    };
  };

  const analyzeOverdueTasks = (): AIInsight => {
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < now;
    });

    // Group by days overdue
    const criticalOverdue = overdueTasks.filter(t => {
      const daysOverdue = Math.floor((now.getTime() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue > 7;
    });

    return {
      action: "overdue-analysis",
      title: "Overdue Tasks Analysis",
      description: `${overdueTasks.length} tasks are overdue (${criticalOverdue.length} critically overdue - 7+ days).`,
      tasks: overdueTasks.sort((a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
      ).slice(0, 10),
      filterConfig: { urgency: 'overdue', sortBy: 'due-date' },
      suggestions: [
        `${criticalOverdue.length} tasks are critically overdue (>7 days)`,
        `Consider rescheduling or marking as cancelled if no longer relevant`,
        `Focus on high-priority overdue items first`,
      ],
    };
  };

  const suggestPrioritization = (): AIInsight => {
    const now = new Date();
    const pendingTasks = tasks.filter(t => t.status !== 'completed');

    // AI logic: Tasks that should be high priority
    const shouldBeHighPriority = pendingTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // If due within 3 days but not high priority
      return daysUntilDue <= 3 && daysUntilDue >= 0 && t.priority !== 'high';
    });

    // Tasks that could be lower priority
    const couldBeLowerPriority = pendingTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // If due in 14+ days but marked high priority
      return daysUntilDue >= 14 && t.priority === 'high';
    });

    const suggestions = [];
    if (shouldBeHighPriority.length > 0) {
      suggestions.push(`${shouldBeHighPriority.length} tasks due soon should be high priority`);
    }
    if (couldBeLowerPriority.length > 0) {
      suggestions.push(`${couldBeLowerPriority.length} tasks with distant deadlines could be lower priority`);
    }

    return {
      action: "prioritize",
      title: "AI Priority Suggestions",
      description: "Tasks that may need priority adjustments based on deadlines and status.",
      tasks: [...shouldBeHighPriority, ...couldBeLowerPriority].slice(0, 10),
      suggestions,
    };
  };

  const generateWeeklyPlan = (): AIInsight => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const thisWeekTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= now && dueDate <= weekEnd;
    });

    // Group by day
    const tasksByDay = thisWeekTasks.reduce((acc, task) => {
      const day = new Date(task.due_date!).toLocaleDateString('en-US', { weekday: 'long' });
      if (!acc[day]) acc[day] = [];
      acc[day].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    const suggestions = Object.entries(tasksByDay).map(([day, tasks]) =>
      `${day}: ${tasks.length} task${tasks.length !== 1 ? 's' : ''} (${tasks.filter(t => t.priority === 'high').length} high priority)`
    );

    return {
      action: "weekly-plan",
      title: "This Week's Plan",
      description: `${thisWeekTasks.length} tasks scheduled for this week.`,
      tasks: thisWeekTasks.sort((a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
      ),
      filterConfig: { urgency: 'this-week', sortBy: 'due-date' },
      suggestions,
    };
  };

  const handleAction = async (action: AIAction) => {
    setOpen(false);
    setIsAnalyzing(true);

    // Simulate AI thinking time for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    let result: AIInsight;

    switch (action) {
      case "focus-today":
        result = analyzeFocusToday();
        break;
      case "overdue-analysis":
        result = analyzeOverdueTasks();
        break;
      case "prioritize":
        result = suggestPrioritization();
        break;
      case "weekly-plan":
        result = generateWeeklyPlan();
        break;
      default:
        result = analyzeFocusToday();
    }

    setInsight(result);
    setIsAnalyzing(false);
    setShowResults(true);
  };

  const applyFilter = () => {
    if (insight?.filterConfig && onApplyFilters) {
      onApplyFilters(insight.filterConfig);
      setShowResults(false);
      toast.success("Filter applied", {
        description: "View updated based on AI suggestion"
      });
    }
  };

  // Calculate stats for smart suggestions
  const now = new Date();
  const overdueTasks = tasks.filter(t =>
    t.status !== 'completed' && t.due_date && new Date(t.due_date) < now
  ).length;

  const todayTasks = tasks.filter(t =>
    t.status !== 'completed' && t.due_date &&
    new Date(t.due_date).toDateString() === now.toDateString()
  ).length;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={variant} size={size} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Assistant
                {overdueTasks > 0 && (
                  <Badge variant="error" className="ml-2 h-5 px-1.5">
                    {overdueTasks}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm text-text-primary mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Smart Task Assistant
              </h4>
              <p className="text-xs text-text-secondary">
                AI-powered insights and actions for your tasks
              </p>
            </div>

            <div className="space-y-1.5">
              {/* Focus Today */}
              <button
                onClick={() => handleAction("focus-today")}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary group-hover:text-blue-700">
                      Today&apos;s Focus
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {todayTasks > 0
                        ? `${todayTasks} task${todayTasks !== 1 ? 's' : ''} need attention today`
                        : "See what you should work on today"
                      }
                    </div>
                  </div>
                </div>
              </button>

              {/* Overdue Analysis */}
              {overdueTasks > 0 && (
                <button
                  onClick={() => handleAction("overdue-analysis")}
                  className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary group-hover:text-red-700 flex items-center gap-2">
                        Overdue Tasks
                        <Badge variant="error" className="h-4 text-xs px-1.5">
                          {overdueTasks}
                        </Badge>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        Analyze and prioritize overdue items
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* Weekly Plan */}
              <button
                onClick={() => handleAction("weekly-plan")}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary group-hover:text-purple-700">
                      Weekly Plan
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      See your tasks organized by day
                    </div>
                  </div>
                </div>
              </button>

              {/* Priority Suggestions */}
              <button
                onClick={() => handleAction("prioritize")}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary group-hover:text-amber-700">
                      Smart Prioritization
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      AI suggests priority adjustments
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <ListChecks className="h-3.5 w-3.5" />
                <span>Analyzing {tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {insight?.title}
            </DialogTitle>
            <DialogDescription>
              {insight?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* AI Suggestions */}
            {insight?.suggestions && insight.suggestions.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h4 className="font-semibold text-sm text-amber-900 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Insights
                </h4>
                <ul className="space-y-1.5">
                  {insight.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                      <span className="text-amber-600 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Task List */}
            {insight?.tasks && insight.tasks.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-text-primary">
                  Recommended Tasks ({insight.tasks.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {insight.tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-text-primary mb-1">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-xs text-text-secondary line-clamp-2 mb-2">
                              {task.description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                task.priority === 'high' ? 'error' :
                                task.priority === 'medium' ? 'warning' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {task.priority}
                            </Badge>
                            {task.due_date && (
                              <div className="text-xs text-text-tertiary flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            )}
                            {task.students && (
                              <div className="text-xs text-text-tertiary">
                                {task.students.first_name} {task.students.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No tasks found matching this criteria</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              {insight?.filterConfig && onApplyFilters && (
                <Button onClick={applyFilter} className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  Apply Filter
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowResults(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
