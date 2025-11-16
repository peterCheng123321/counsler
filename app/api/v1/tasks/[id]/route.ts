import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";
import { getTaskTool } from "@/lib/ai/tools";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  studentId: z.string().uuid().optional(),
  reminder1day: z.boolean().optional(),
  reminder1hour: z.boolean().optional(),
  reminder15min: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Use LangChain tool to fetch task details
    const result = await getTaskTool.func({ taskId: id });

    // Parse the tool result (it returns JSON string)
    const parsed = JSON.parse(result);

    // Check if there was an error
    if (parsed.error) {
      console.error("Task tool error:", parsed.error);
      return NextResponse.json(
        { error: parsed.error, details: parsed.details },
        { status: parsed.error === "Task not found" ? 404 : 500 }
      );
    }

    // Fetch student data if task has student_id
    let student = null;
    if (parsed.student_id) {
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name, email")
        .eq("id", parsed.student_id)
        .single();

      if (studentData) {
        student = studentData;
      }
    }

    const taskWithStudent = {
      ...parsed,
      students: student,
    };

    return NextResponse.json({ data: taskWithStudent, success: true });
  } catch (error) {
    console.error("Unexpected error in GET task:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient(); // Demo mode: Use admin client
    // Demo mode: Skip authentication check
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // Map camelCase to snake_case for database
    const updateData: Record<string, unknown> = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.dueDate !== undefined) updateData.due_date = validatedData.dueDate;
    if (validatedData.dueTime !== undefined) updateData.due_time = validatedData.dueTime;
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      if (validatedData.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }
    if (validatedData.studentId !== undefined) updateData.student_id = validatedData.studentId || null;
    if (validatedData.reminder1day !== undefined) updateData.reminder_1day = validatedData.reminder1day;
    if (validatedData.reminder1hour !== undefined) updateData.reminder_1hour = validatedData.reminder1hour;
    if (validatedData.reminder15min !== undefined) updateData.reminder_15min = validatedData.reminder15min;

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", id)
      .eq("counselor_id", userId)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating task:", error);
      return NextResponse.json(
        { error: "Failed to update task", details: error.message },
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

    return NextResponse.json({ data: taskWithStudent, success: true });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient(); // Demo mode: Use admin client
    // Demo mode: Skip authentication check
    const userId = DEMO_USER_ID;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("counselor_id", userId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete task" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

