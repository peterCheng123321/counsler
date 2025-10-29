"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  Clock,
  Users,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient, type Task, type Student } from "@/lib/api/client";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

interface Insight {
  id: string;
  entity_type: string;
  entity_id: string | null;
  kind: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();

  // Fetch today's tasks
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split("T")[0];
      
      return apiClient.getTasks({
        dueDateFrom: today,
        dueDateTo: nextWeekStr,
        status: "pending",
      });
    },
  });

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => apiClient.getStudents(),
  });

  // Fetch latest insights
  const { data: insightsData } = useQuery({
    queryKey: ["insights", "latest"],
    queryFn: async () => {
      const response = await fetch("/api/v1/insights?limit=5", {
        credentials: "include",
      });
      if (!response.ok) return { data: [] };
      return response.json();
    },
  });

  const tasks = tasksData?.data || [];
  const students = studentsData?.data || [];
  const insights = insightsData?.data || [];

  // Get urgent students (high risk or low progress)
  const urgentStudents = students
    .filter((s: Student) => 
      (s.application_progress || 0) < 30 || 
      tasks.filter((t: Task) => t.student_id === s.id && new Date(t.due_date) < new Date()).length > 0
    )
    .slice(0, 5);

  // Group tasks by date
  const todayTasks = tasks.filter((t: Task) => {
    const dueDate = parseISO(t.due_date);
    return isToday(dueDate);
  });

  const tomorrowTasks = tasks.filter((t: Task) => {
    const dueDate = parseISO(t.due_date);
    return isTomorrow(dueDate);
  });

  const upcomingTasks = tasks.filter((t: Task) => {
    const dueDate = parseISO(t.due_date);
    return !isToday(dueDate) && !isTomorrow(dueDate);
  }).slice(0, 5);

  const handleQuickAction = (action: string) => {
    if (action === "analyze") {
      router.push(`/chatbot?action=analyze`);
    } else {
      router.push(`/chatbot?action=${action}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Welcome back
          </h1>
          <p className="text-text-secondary mt-1">
            Here&apos;s what&apos;s happening today
          </p>
        </div>
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Demo Mode
            </Badge>
          )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/chatbot")}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">AI Assistant</p>
              <p className="text-xs text-text-tertiary">Get help</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickAction("analyze")}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Run Analysis</p>
              <p className="text-xs text-text-tertiary">Check insights</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/students")}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Students</p>
              <p className="text-xs text-text-tertiary">{students.length} total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/tasks")}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
              <CheckCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Tasks</p>
              <p className="text-xs text-text-tertiary">{tasks.length} upcoming</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-text-primary">Today&apos;s Tasks</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/tasks")}>
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tasks due today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task: Task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">{task.title}</p>
                      {task.students && (
                        <p className="text-sm text-text-tertiary">
                          {task.students.first_name} {task.students.last_name}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        task.priority === "high"
                          ? "destructive"
                          : task.priority === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {tomorrowTasks.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tomorrow ({tomorrowTasks.length})
                </h3>
                <div className="space-y-2">
                  {tomorrowTasks.slice(0, 3).map((task: Task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 rounded border border-border/50 hover:bg-surface/30 transition-colors"
                    >
                      <p className="text-sm text-text-primary">{task.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Urgent Students */}
          {urgentStudents.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <h2 className="text-xl font-semibold text-text-primary">Urgent Attention</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push("/students")}>
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="space-y-3">
                {urgentStudents.map((student: Student) => {
                  const studentTasks = tasks.filter((t: Task) => t.student_id === student.id);
                  const overdueTasks = studentTasks.filter(
                    (t: Task) => new Date(t.due_date) < new Date() && t.status !== "completed"
                  );

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/students/${student.id}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">
                          {student.first_name} {student.last_name}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-text-tertiary">
                          <span>Progress: {student.application_progress || 0}%</span>
                          {overdueTasks.length > 0 && (
                            <span className="text-warning">
                              {overdueTasks.length} overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-warning border-warning">
                        At Risk
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Insights & Recommendations Sidebar */}
        <div className="space-y-4">
          {/* Latest Insights */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary">Latest Insights</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction("analyze")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {insights.length === 0 ? (
              <div className="text-center py-6 text-text-tertiary">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No insights yet</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleQuickAction("analyze")}
                >
                  Run Analysis
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight: Insight) => (
                  <div
                    key={insight.id}
                    className="p-3 rounded-lg border border-border bg-surface/50 hover:bg-surface transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {insight.kind.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-text-tertiary">
                        {format(parseISO(insight.created_at), "MMM d")}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary line-clamp-3 mt-2">
                      {insight.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Total Students</span>
                <span className="font-semibold text-text-primary">{students.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Tasks Today</span>
                <span className="font-semibold text-text-primary">{todayTasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Upcoming This Week</span>
                <span className="font-semibold text-text-primary">{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Urgent Students</span>
                <span className="font-semibold text-warning">{urgentStudents.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

