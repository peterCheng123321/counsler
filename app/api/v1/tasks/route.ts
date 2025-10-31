import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryCache } from "@/lib/cache/query-cache";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";
import { getTasksTool } from "@/lib/ai/langchain-tools";

const taskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  studentId: z.string().uuid().optional(),
  reminder1day: z.boolean().default(false),
  reminder1hour: z.boolean().default(false),
  reminder15min: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const studentId = searchParams.get("studentId");
    const dueDateFrom = searchParams.get("dueDateFrom");
    const dueDateTo = searchParams.get("dueDateTo");

    // Use LangChain tool to fetch tasks
    const result = await getTasksTool.func({
      status: status as "pending" | "in_progress" | "completed" | "cancelled" | undefined,
      priority: priority as "low" | "medium" | "high" | undefined,
      studentId: studentId || undefined,
      dueDateFrom: dueDateFrom || undefined,
      dueDateTo: dueDateTo || undefined,
    });

    // Parse the tool result (it returns JSON string)
    const parsed = JSON.parse(result);

    // Check if there was an error
    if (parsed.error) {
      console.error("Tasks tool error:", parsed.error);
      return NextResponse.json(
        { error: parsed.error, details: parsed.details },
        { status: 500 }
      );
    }

    // Fetch student data for tasks that have student_id
    const tasks = parsed.tasks || [];
    const studentIds = tasks
      .map((task: any) => task.student_id)
      .filter((id: any): id is string => id !== null && id !== undefined);

    let studentsMap: Record<string, any> = {};
    if (studentIds.length > 0) {
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, first_name, last_name, email")
        .in("id", studentIds);

      if (!studentsError && students) {
        studentsMap = students.reduce((acc, student) => {
          acc[student.id] = student;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Combine tasks with student data
    const tasksWithStudents = tasks.map((task: any) => ({
      ...task,
      students: task.student_id ? studentsMap[task.student_id] || null : null,
    }));

    return NextResponse.json({ data: tasksWithStudents, success: true });
  } catch (error) {
    console.error("Unexpected error in GET tasks:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient(); // Demo mode: Use admin client
    // Demo mode: Skip authentication check
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const validatedData = taskSchema.parse(body);

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        counselor_id: userId,
        student_id: validatedData.studentId || null,
        title: validatedData.title,
        description: validatedData.description,
        due_date: validatedData.dueDate,
        due_time: validatedData.dueTime || null,
        priority: validatedData.priority,
        reminder_1day: validatedData.reminder1day,
        reminder_1hour: validatedData.reminder1hour,
        reminder_15min: validatedData.reminder15min,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return NextResponse.json(
        { error: "Failed to create task", details: error.message },
        { status: 500 }
      );
    }

    // Fetch student data if task has student_id
    let student = null;
    if (task.student_id) {
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name, email")
        .eq("id", task.student_id)
        .eq("counselor_id", userId)
        .single();
      
      if (studentData) {
        student = studentData;
      }
    }

    const taskWithStudent = {
      ...task,
      students: student,
    };

    // Invalidate cache
    queryCache.invalidateUser(userId);

    return NextResponse.json({ data: taskWithStudent, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

