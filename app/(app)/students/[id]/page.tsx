"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Edit, 
  MoreVertical, 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FileText,
  Mail,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";

interface RiskScore {
  score: number;
  rationale: string;
  factors: any;
}

interface Insight {
  id: string;
  content: string;
  kind: string;
  created_at: string;
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["student", id],
    queryFn: () => apiClient.getStudent(id),
  });

  // Fetch risk score
  const { data: riskData, refetch: refetchRisk } = useQuery({
    queryKey: ["student-risk", id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "risk_scoring",
          studentId: id,
        }),
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch AI summary
  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ["student-summary", id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/insights?entityType=student&entityId=${id}&kind=summary&limit=1`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data?.[0] || null;
    },
    enabled: !!id,
  });

  // Fetch student tasks
  const { data: tasksData } = useQuery({
    queryKey: ["student-tasks", id],
    queryFn: () => apiClient.getTasks({ studentId: id }),
    enabled: !!id,
  });

  const student = data?.data;
  const riskScore: RiskScore | null = riskData?.data || null;
  const summary: Insight | null = summaryData || null;
  const tasks = tasksData?.data || [];

  const handleQuickAction = async (action: string) => {
    if (action === "generate-summary") {
      await refetchSummary();
      router.push(`/chatbot?action=summarize&studentId=${id}`);
    } else if (action === "calculate-risk") {
      await refetchRisk();
    } else if (action === "create-task") {
      router.push(`/tasks?studentId=${id}`);
    } else if (action === "chat") {
      router.push(`/chatbot?studentId=${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-48 rounded-lg bg-surface" />
        <div className="h-64 rounded-lg bg-surface" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="rounded-lg border border-error bg-error-light p-4 text-error">
        Student not found or failed to load.
      </div>
    );
  }

  const initials = `${student.first_name[0]}${student.last_name[0]}`.toUpperCase();
  const fullName = `${student.first_name} ${student.last_name}`;
  const overdueTasks = tasks.filter(
    (t: any) => new Date(t.due_date) < new Date() && t.status !== "completed"
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/students">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-8 text-white">
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-white/30">
                  <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-heading-1 font-bold">{fullName}</h1>
                  <p className="text-lg opacity-90">
                    Senior • Class of {student.graduation_year}
                  </p>
                  <p className="text-sm opacity-75">{student.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative z-10 mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Overall Progress</span>
                <span className="text-sm font-semibold">
                  {student.application_progress}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${student.application_progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Academic Info */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Academic Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {student.gpa_unweighted && (
                <div>
                  <p className="text-sm text-text-tertiary">Unweighted GPA</p>
                  <p className="text-lg font-semibold text-text-primary">{student.gpa_unweighted}</p>
                </div>
              )}
              {student.gpa_weighted && (
                <div>
                  <p className="text-sm text-text-tertiary">Weighted GPA</p>
                  <p className="text-lg font-semibold text-text-primary">{student.gpa_weighted}</p>
                </div>
              )}
              {student.sat_score && (
                <div>
                  <p className="text-sm text-text-tertiary">SAT Score</p>
                  <p className="text-lg font-semibold text-text-primary">{student.sat_score}</p>
                </div>
              )}
              {student.act_score && (
                <div>
                  <p className="text-sm text-text-tertiary">ACT Score</p>
                  <p className="text-lg font-semibold text-text-primary">{student.act_score}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Tasks */}
          {tasks.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-text-primary">Tasks</h2>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/tasks?studentId=${id}`)}>
                  View all
                </Button>
              </div>
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">{task.title}</p>
                      <p className="text-sm text-text-tertiary">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
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
              {overdueTasks.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-warning-light border border-warning">
                  <p className="text-sm text-warning">
                    {overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* AI Sidebar */}
        <div className="space-y-4">
          {/* Risk Score */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h2 className="text-lg font-semibold text-text-primary">Risk Score</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction("calculate-risk")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {riskScore ? (
              <div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-text-primary">
                      {Math.round(riskScore.score)}
                    </span>
                    <Badge
                      variant={
                        riskScore.score >= 70
                          ? "error"
                          : riskScore.score >= 40
                          ? "warning"
                          : "success"
                      }
                    >
                      {riskScore.score >= 70
                        ? "High Risk"
                        : riskScore.score >= 40
                        ? "Medium Risk"
                        : "Low Risk"}
                    </Badge>
                  </div>
                  <Progress value={riskScore.score} className="h-2" />
                </div>
                <p className="text-sm text-text-secondary">{riskScore.rationale}</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-text-tertiary mb-3">No risk score calculated</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction("calculate-risk")}
                >
                  Calculate Risk
                </Button>
              </div>
            )}
          </Card>

          {/* AI Summary */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary">AI Summary</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction("generate-summary")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {summary ? (
              <div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {summary.content}
                </p>
                <p className="text-xs text-text-tertiary mt-2">
                  Generated {new Date(summary.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-text-tertiary mb-3">No summary available</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction("generate-summary")}
                >
                  Generate Summary
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAction("chat")}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Chat with AI
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAction("create-task")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Create Task
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAction("generate-summary")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Summary
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
