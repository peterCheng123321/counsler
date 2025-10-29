/**
 * Analysis API Route
 * Handles running AI analysis modules (risk scoring, forecasting, anomaly detection, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  calculateStudentRiskScore,
  saveRiskScore,
  forecastWorkload,
  detectAnomalies,
} from "@/lib/analysis";
import { DEMO_MODE, DEMO_WORKSPACE_ID } from "@/lib/env";

const runAnalysisSchema = z.object({
  module: z.enum([
    "risk_scoring",
    "workload_forecast",
    "anomaly_detection",
    "cohort_trends",
    "task_efficiency",
  ]),
  studentId: z.string().uuid().optional(),
  days: z.number().min(1).max(90).optional().default(14),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { module, studentId, days } = runAnalysisSchema.parse(body);

    // Create analysis run record
    const { data: runRecord, error: runError } = await supabase
      .from("analysis_runs")
      .insert({
        user_id: user.id,
        module,
        status: "running",
        demo: DEMO_MODE,
        demo_workspace_id: DEMO_MODE ? DEMO_WORKSPACE_ID : null,
      })
      .select()
      .single();

    if (runError) {
      console.error("Failed to create analysis run:", runError);
    }

    try {
      let result: any;

      switch (module) {
        case "risk_scoring": {
          if (!studentId) {
            return NextResponse.json(
              { error: "studentId is required for risk_scoring" },
              { status: 400 }
            );
          }

          const riskResult = await calculateStudentRiskScore(studentId);
          await saveRiskScore(studentId, riskResult);
          result = riskResult;
          break;
        }

        case "workload_forecast": {
          const forecast = await forecastWorkload(days);
          result = forecast;
          break;
        }

        case "anomaly_detection": {
          const anomalies = await detectAnomalies();
          result = { anomalies, count: anomalies.length };
          break;
        }

        case "cohort_trends": {
          // Simplified cohort trends - can be expanded
          const { data: students } = await supabase
            .from("students")
            .select("graduation_year, application_progress")
            .eq("counselor_id", user.id);

          const cohortMap = new Map<number, { count: number; avgProgress: number }>();
          students?.forEach((student) => {
            const year = student.graduation_year;
            if (!cohortMap.has(year)) {
              cohortMap.set(year, { count: 0, avgProgress: 0 });
            }
            const cohort = cohortMap.get(year)!;
            cohort.count++;
            cohort.avgProgress += student.application_progress || 0;
          });

          const trends = Array.from(cohortMap.entries()).map(([year, data]) => ({
            graduationYear: year,
            studentCount: data.count,
            averageProgress: Math.round((data.avgProgress / data.count) * 100) / 100,
          }));

          result = { trends };
          break;
        }

        case "task_efficiency": {
          // Simplified task efficiency - can be expanded
          const { data: tasks } = await supabase
            .from("tasks")
            .select("status, priority, due_date, completed_at, created_at")
            .eq("counselor_id", user.id);

          const total = tasks?.length || 0;
          const completed = tasks?.filter((t) => t.status === "completed").length || 0;
          const overdue = tasks?.filter((t) => {
            if (t.status === "completed") return false;
            const dueDate = new Date(t.due_date);
            return dueDate < new Date();
          }).length || 0;

          const onTimeRate = total > 0 ? (completed / total) * 100 : 0;

          result = {
            totalTasks: total,
            completedTasks: completed,
            overdueTasks: overdue,
            onTimeRate: Math.round(onTimeRate * 100) / 100,
          };
          break;
        }

        default:
          return NextResponse.json(
            { error: `Unknown module: ${module}` },
            { status: 400 }
          );
      }

      // Update analysis run to completed
      if (runRecord) {
        await supabase
          .from("analysis_runs")
          .update({
            status: "completed",
            finished_at: new Date().toISOString(),
            metadata: { result },
          })
          .eq("id", runRecord.id);
      }

      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      // Update analysis run to failed
      if (runRecord) {
        await supabase
          .from("analysis_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message:
              error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", runRecord.id);
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

