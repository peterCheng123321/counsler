import { NextRequest, NextResponse } from "next/server";
import {
  analyzeStudentData,
  analyzeTaskData,
  analyzeProgressTrends,
  analyzeDeadlines,
  type AnalysisRequest,
} from "@/lib/ai/data-analyzer";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";
import { z } from "zod";

const analyzeRequestSchema = z.object({
  dataType: z.enum(["students", "tasks", "progress", "deadlines"]),
  data: z.any().optional(),
  context: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
});

/**
 * POST /api/v1/analyze - Analyze data with AI
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const { dataType, data, context, focusAreas, filters } = analyzeRequestSchema.parse(body);

    let analysisResult;

    switch (dataType) {
      case "students": {
        // If no data provided, fetch from database
        let students = data;
        if (!students) {
          let query = supabase.from("students").select("*").eq("counselor_id", userId);

          if (filters) {
            for (const [key, value] of Object.entries(filters)) {
              query = query.eq(key, value);
            }
          }

          const { data: fetchedStudents, error } = await query;
          if (error) {
            return NextResponse.json(
              { error: "Failed to fetch students", details: error.message },
              { status: 500 }
            );
          }
          students = fetchedStudents;
        }

        if (!students || students.length === 0) {
          return NextResponse.json(
            { error: "No student data available to analyze" },
            { status: 400 }
          );
        }

        analysisResult = await analyzeStudentData(students, focusAreas);
        break;
      }

      case "tasks": {
        // If no data provided, fetch from database
        let tasks = data;
        if (!tasks) {
          let query = supabase.from("tasks").select("*, students(first_name, last_name)");

          if (filters) {
            for (const [key, value] of Object.entries(filters)) {
              query = query.eq(key, value);
            }
          }

          const { data: fetchedTasks, error } = await query;
          if (error) {
            return NextResponse.json(
              { error: "Failed to fetch tasks", details: error.message },
              { status: 500 }
            );
          }

          // Flatten student name for easier access
          tasks = fetchedTasks?.map((t: any) => ({
            ...t,
            student_name: t.students
              ? `${t.students.first_name} ${t.students.last_name}`
              : null,
          }));
        }

        if (!tasks || tasks.length === 0) {
          return NextResponse.json(
            { error: "No task data available to analyze" },
            { status: 400 }
          );
        }

        analysisResult = await analyzeTaskData(tasks, focusAreas);
        break;
      }

      case "progress": {
        if (!data) {
          return NextResponse.json(
            { error: "Progress trend data is required" },
            { status: 400 }
          );
        }

        analysisResult = await analyzeProgressTrends(data, context);
        break;
      }

      case "deadlines": {
        // If no data provided, fetch upcoming deadlines
        let deadlines = data;
        if (!deadlines) {
          const { data: tasks, error } = await supabase
            .from("tasks")
            .select("id, title, due_date, priority, students(first_name, last_name)")
            .not("due_date", "is", null)
            .neq("status", "completed")
            .order("due_date", { ascending: true })
            .limit(50);

          if (error) {
            return NextResponse.json(
              { error: "Failed to fetch deadlines", details: error.message },
              { status: 500 }
            );
          }

          deadlines = tasks?.map((t: any) => ({
            id: t.id,
            title: t.title,
            dueDate: t.due_date,
            priority: t.priority,
            studentName: t.students
              ? `${t.students.first_name} ${t.students.last_name}`
              : null,
          }));
        }

        if (!deadlines || deadlines.length === 0) {
          return NextResponse.json(
            { error: "No deadline data available to analyze" },
            { status: 400 }
          );
        }

        analysisResult = await analyzeDeadlines(deadlines);
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid data type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[Analyze API] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
