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
      const response = await fetch("/api/v1/insights?limit=5");
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
    router.push(`/chatbot?action=${action}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Sparkles className="h-8 w-8" />
              Welcome back!
            </h1>
            <p className="text-blue-100 text-lg">
              Here&apos;s what&apos;s happening today
            </p>
          </div>
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <Badge variant="outline" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              🎬 Demo Mode
            </Badge>
          )}
        </div>
        {/* Decorative Elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-300/20 blur-3xl"></div>
      </div>

      {/* Quick Actions with Enhanced Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group p-6 hover-lift bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100" onClick={() => router.push("/chatbot")}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary mb-1">AI Assistant</p>
              <p className="text-xs text-text-secondary">Get instant help</p>
            </div>
          </div>
        </Card>

        <Card className="group p-6 hover-lift bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100" onClick={() => handleQuickAction("analyze")}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary mb-1">Run Analysis</p>
              <p className="text-xs text-text-secondary">Check insights</p>
            </div>
          </div>
        </Card>

        <Card className="group p-6 hover-lift bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100" onClick={() => router.push("/students")}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary mb-1">Students</p>
              <p className="text-xs text-text-secondary">{students.length} total</p>
            </div>
          </div>
        </Card>

        <Card className="group p-6 hover-lift bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100" onClick={() => router.push("/tasks")}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary mb-1">Tasks</p>
              <p className="text-xs text-text-secondary">{tasks.length} upcoming</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Today&apos;s Tasks</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/tasks")} className="hover:bg-blue-50">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-12 text-text-tertiary">
                <div className="inline-flex p-4 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-lg font-medium">All done for today!</p>
                <p className="text-sm mt-1">No tasks due today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task: Task, index: number) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all hover-lift group animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-1 h-12 rounded-full ${
                        task.priority === "high" ? "bg-red-500" :
                        task.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                      }`} />
                      <div className="flex-1">
                        <p className="font-semibold text-text-primary group-hover:text-blue-600 transition-colors">{task.title}</p>
                        {task.students && (
                          <p className="text-sm text-text-secondary mt-1">
                            👤 {task.students.first_name} {task.students.last_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        task.priority === "high"
                          ? "destructive"
                          : task.priority === "medium"
                          ? "default"
                          : "secondary"
                      }
                      className="font-medium"
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
            <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary">Urgent Attention</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push("/students")} className="hover:bg-red-100">
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="space-y-3">
                {urgentStudents.map((student: Student, index: number) => {
                  const studentTasks = tasks.filter((t: Task) => t.student_id === student.id);
                  const overdueTasks = studentTasks.filter(
                    (t: Task) => new Date(t.due_date) < new Date() && t.status !== "completed"
                  );

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white border border-red-200 hover:border-red-400 hover:shadow-lg transition-all hover-lift cursor-pointer group animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => router.push(`/students/${student.id}`)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
                          {student.first_name[0]}{student.last_name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-text-primary group-hover:text-red-600 transition-colors">
                            {student.first_name} {student.last_name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                            <span className="flex items-center gap-1">
                              📊 {student.application_progress || 0}%
                            </span>
                            {overdueTasks.length > 0 && (
                              <span className="text-red-600 font-medium">
                                ⚠️ {overdueTasks.length} overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-400 bg-red-50 font-medium">
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
        <div className="space-y-6">
          {/* Latest Insights */}
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-text-primary">AI Insights</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction("analyze")}
                className="hover:bg-purple-100"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {insights.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex p-3 rounded-full bg-purple-100 mb-3">
                  <Lightbulb className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-text-primary mb-2">No insights yet</p>
                <p className="text-xs text-text-secondary mb-4">Run AI analysis to get started</p>
                <Button
                  size="sm"
                  onClick={() => handleQuickAction("analyze")}
                  className="gradient-primary"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Run Analysis
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight: Insight, index: number) => (
                  <div
                    key={insight.id}
                    className="p-4 rounded-xl bg-white border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
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
          <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Quick Stats
            </h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
                <span className="text-sm font-medium text-text-secondary">Total Students</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{students.length}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                <span className="text-sm font-medium text-text-secondary">Tasks Today</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{todayTasks.length}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50">
                <span className="text-sm font-medium text-text-secondary">Upcoming This Week</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{tasks.length}</span>
                  </div>
                </div>
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

