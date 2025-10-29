/**
 * AI Analysis utilities
 * Provides functions for risk scoring, forecasting, anomaly detection, and other analysis modules
 */

import { createClient } from "@/lib/supabase/server";
import { aiServiceManager } from "@/lib/ai";
import { createInsight, InsightKind } from "@/lib/insights";
import { DEMO_MODE, DEMO_WORKSPACE_ID } from "@/lib/env";

export interface RiskScoreFactors {
  overdueTasks: number;
  inactiveDays: number;
  lowProgress: boolean;
  missedMilestones: number;
  gpaBelowThreshold?: boolean;
}

export interface RiskScoreResult {
  score: number; // 0-100, higher = more at risk
  rationale: string;
  factors: RiskScoreFactors;
}

/**
 * Calculate risk score for a student
 */
export async function calculateStudentRiskScore(
  studentId: string
): Promise<RiskScoreResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get student data
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("counselor_id", user.id)
    .single();

  if (studentError || !student) {
    throw new Error("Student not found");
  }

  // Get overdue tasks
  const today = new Date().toISOString().split("T")[0];
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("student_id", studentId)
    .eq("counselor_id", user.id)
    .in("status", ["pending", "in_progress"])
    .lt("due_date", today);

  const overdueCount = overdueTasks?.length || 0;

  // Calculate inactive days (days since last task completion or note)
  const { data: lastActivity } = await supabase
    .from("tasks")
    .select("completed_at")
    .eq("student_id", studentId)
    .eq("counselor_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  let inactiveDays = 0;
  if (lastActivity?.completed_at) {
    const lastDate = new Date(lastActivity.completed_at);
    const daysDiff = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    inactiveDays = daysDiff;
  } else {
    // No completed tasks, check notes
    const { data: lastNote } = await supabase
      .from("notes")
      .select("created_at")
      .eq("student_id", studentId)
      .eq("counselor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastNote?.created_at) {
      const lastDate = new Date(lastNote.created_at);
      const daysDiff = Math.floor(
        (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      inactiveDays = daysDiff;
    } else {
      inactiveDays = 999; // Very inactive
    }
  }

  // Check application progress
  const lowProgress = (student.application_progress || 0) < 30;

  // Count missed milestones (could be expanded)
  const missedMilestones = overdueCount > 0 ? 1 : 0;

  // Check GPA if available
  const gpaBelowThreshold =
    student.gpa_unweighted !== null && student.gpa_unweighted < 3.0;

  const factors: RiskScoreFactors = {
    overdueTasks: overdueCount,
    inactiveDays,
    lowProgress,
    missedMilestones,
    gpaBelowThreshold,
  };

  // Calculate score (simple weighted formula, can be enhanced with AI)
  let score = 0;
  score += Math.min(overdueCount * 15, 40); // Max 40 points for overdue tasks
  score += Math.min(inactiveDays * 0.5, 30); // Max 30 points for inactivity
  score += lowProgress ? 20 : 0;
  score += missedMilestones * 10;
  score += gpaBelowThreshold ? 10 : 0;

  score = Math.min(score, 100);

  // Generate rationale using AI
  const rationale = await generateRiskRationale(student, factors, score);

  return {
    score: Math.round(score * 100) / 100,
    rationale,
    factors,
  };
}

/**
 * Generate risk score rationale using AI
 */
async function generateRiskRationale(
  student: any,
  factors: RiskScoreFactors,
  score: number
): Promise<string> {
  const prompt = `Analyze this student's risk factors and provide a concise rationale:

Student: ${student.first_name} ${student.last_name}
Graduation Year: ${student.graduation_year}
Application Progress: ${student.application_progress || 0}%

Risk Factors:
- Overdue Tasks: ${factors.overdueTasks}
- Days Since Last Activity: ${factors.inactiveDays}
- Low Progress: ${factors.lowProgress}
- Missed Milestones: ${factors.missedMilestones}
- GPA Below Threshold: ${factors.gpaBelowThreshold || false}

Risk Score: ${score}/100

Provide a 2-3 sentence rationale explaining the risk level and key concerns.`;

  try {
    const response = await aiServiceManager.chat(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.7,
        maxTokens: 200,
      }
    );
    return response.content;
  } catch (error) {
    // Fallback rationale if AI fails
    const concerns: string[] = [];
    if (factors.overdueTasks > 0) {
      concerns.push(`${factors.overdueTasks} overdue task(s)`);
    }
    if (factors.inactiveDays > 7) {
      concerns.push(`${factors.inactiveDays} days of inactivity`);
    }
    if (factors.lowProgress) {
      concerns.push("low application progress");
    }

    if (concerns.length === 0) {
      return `Student is on track with a risk score of ${score}/100.`;
    }

    return `Risk score of ${score}/100 based on: ${concerns.join(", ")}.`;
  }
}

/**
 * Forecast workload for next N days
 */
export async function forecastWorkload(
  days: number = 14
): Promise<{
  forecast: Array<{ date: string; taskCount: number; priority: string }>;
  summary: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  const todayStr = today.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // Get tasks due in the forecast period
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("due_date, priority, status")
    .eq("counselor_id", user.id)
    .in("status", ["pending", "in_progress"])
    .gte("due_date", todayStr)
    .lte("due_date", endDateStr);

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  // Group by date and priority
  const forecastMap = new Map<
    string,
    { total: number; high: number; medium: number; low: number }
  >();

  tasks?.forEach((task) => {
    const date = task.due_date;
    if (!forecastMap.has(date)) {
      forecastMap.set(date, { total: 0, high: 0, medium: 0, low: 0 });
    }
    const entry = forecastMap.get(date)!;
    entry.total++;
    if (task.priority === "high") entry.high++;
    else if (task.priority === "medium") entry.medium++;
    else entry.low++;
  });

  const forecast = Array.from(forecastMap.entries())
    .map(([date, counts]) => ({
      date,
      taskCount: counts.total,
      priority:
        counts.high > 0
          ? "high"
          : counts.medium > 0
          ? "medium"
          : "low",
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Generate summary
  const totalTasks = tasks?.length || 0;
  const highPriorityTasks =
    tasks?.filter((t) => t.priority === "high").length || 0;
  const summary = `Over the next ${days} days, you have ${totalTasks} tasks due, with ${highPriorityTasks} high-priority items.`;

  return { forecast, summary };
}

/**
 * Detect anomalies in student activity
 */
export async function detectAnomalies(): Promise<
  Array<{
    studentId: string;
    studentName: string;
    anomalyType: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const anomalies: Array<{
    studentId: string;
    studentName: string;
    anomalyType: string;
    description: string;
    severity: "low" | "medium" | "high";
  }> = [];

  // Get all students
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, application_progress")
    .eq("counselor_id", user.id);

  if (!students) return anomalies;

  // Check for sudden drops in progress
  for (const student of students) {
    // This is simplified - in production, you'd compare against historical data
    if (student.application_progress < 20) {
      anomalies.push({
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        anomalyType: "low_progress",
        description: `Application progress is very low (${student.application_progress}%)`,
        severity: "high",
      });
    }
  }

  // Check for students with many overdue tasks
  const today = new Date().toISOString().split("T")[0];
  const { data: overdueByStudent } = await supabase
    .from("tasks")
    .select("student_id, students!inner(id, first_name, last_name)")
    .eq("counselor_id", user.id)
    .in("status", ["pending", "in_progress"])
    .lt("due_date", today);

  const overdueCounts = new Map<string, number>();
  overdueByStudent?.forEach((task: any) => {
    const studentId = task.student_id || "none";
    overdueCounts.set(studentId, (overdueCounts.get(studentId) || 0) + 1);
  });

  overdueCounts.forEach((count, studentId) => {
    if (count >= 3) {
      const task = overdueByStudent?.find(
        (t: any) => (t.student_id || "none") === studentId
      );
      if (task?.students) {
        const student = Array.isArray(task.students)
          ? task.students[0]
          : task.students;
        anomalies.push({
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          anomalyType: "multiple_overdue",
          description: `${count} overdue tasks`,
          severity: count >= 5 ? "high" : "medium",
        });
      }
    }
  });

  return anomalies;
}

/**
 * Save risk score to database
 */
export async function saveRiskScore(
  studentId: string,
  result: RiskScoreResult
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check if student belongs to user
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("counselor_id", user.id)
    .single();

  if (!student) {
    throw new Error("Student not found");
  }

  const isDemo = DEMO_MODE;

  // Insert risk score
  const { error } = await supabase.from("student_risk_scores").insert({
    student_id: studentId,
    score: result.score,
    rationale: result.rationale,
    factors: result.factors,
    demo: isDemo,
  });

  if (error) {
    throw new Error(`Failed to save risk score: ${error.message}`);
  }

  // Also save as insight
  await createInsight({
    entity_type: "student",
    entity_id: studentId,
    kind: "risk_score",
    content: result.rationale,
    metadata: {
      score: result.score,
      factors: result.factors,
    },
    demo: isDemo,
  });
}

