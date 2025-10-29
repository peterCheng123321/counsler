/**
 * Tasks Tools API Route
 * Handles AI tool calls for task operations (create, update, schedule reminder, link to student)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  studentId: z.string().uuid().optional(),
});

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  updates: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    studentId: z.string().uuid().optional().nullable(),
  }),
});

const scheduleReminderSchema = z.object({
  taskId: z.string().uuid(),
  reminder1day: z.boolean().default(false),
  reminder1hour: z.boolean().default(false),
  reminder15min: z.boolean().default(false),
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
    const { action, ...params } = body;

    switch (action) {
      case "create_task": {
        const { title, description, dueDate, dueTime, priority, studentId } =
          createTaskSchema.parse(params);

        // Verify student belongs to user if provided
        if (studentId) {
          const { data: student } = await supabase
            .from("students")
            .select("id")
            .eq("id", studentId)
            .eq("counselor_id", user.id)
            .single();

          if (!student) {
            return NextResponse.json(
              { error: "Student not found" },
              { status: 404 }
            );
          }
        }

        const { data, error } = await supabase
          .from("tasks")
          .insert({
            counselor_id: user.id,
            student_id: studentId || null,
            title,
            description: description || null,
            due_date: dueDate,
            due_time: dueTime || null,
            priority,
            status: "pending",
          })
          .select(`
            *,
            students (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .single();

        if (error) {
          return NextResponse.json(
            { error: `Failed to create task: ${error.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data });
      }

      case "update_task": {
        const { taskId, updates } = updateTaskSchema.parse(params);

        // Verify task belongs to user
        const { data: task } = await supabase
          .from("tasks")
          .select("id")
          .eq("id", taskId)
          .eq("counselor_id", user.id)
          .single();

        if (!task) {
          return NextResponse.json(
            { error: "Task not found" },
            { status: 404 }
          );
        }

        // Verify student belongs to user if updating studentId
        if (updates.studentId !== undefined && updates.studentId !== null) {
          const { data: student } = await supabase
            .from("students")
            .select("id")
            .eq("id", updates.studentId)
            .eq("counselor_id", user.id)
            .single();

          if (!student) {
            return NextResponse.json(
              { error: "Student not found" },
              { status: 404 }
            );
          }
        }

        // Build update object
        const updateData: any = {};
        if (updates.title) updateData.title = updates.title;
        if (updates.description !== undefined)
          updateData.description = updates.description;
        if (updates.dueDate) updateData.due_date = updates.dueDate;
        if (updates.dueTime !== undefined)
          updateData.due_time = updates.dueTime;
        if (updates.priority) updateData.priority = updates.priority;
        if (updates.status) {
          updateData.status = updates.status;
          if (updates.status === "completed") {
            updateData.completed_at = new Date().toISOString();
          }
        }
        if (updates.studentId !== undefined)
          updateData.student_id = updates.studentId;

        const { data, error } = await supabase
          .from("tasks")
          .update(updateData)
          .eq("id", taskId)
          .select(`
            *,
            students (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .single();

        if (error) {
          return NextResponse.json(
            { error: `Failed to update task: ${error.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data });
      }

      case "schedule_reminder": {
        const { taskId, reminder1day, reminder1hour, reminder15min } =
          scheduleReminderSchema.parse(params);

        // Verify task belongs to user
        const { data: task } = await supabase
          .from("tasks")
          .select("id")
          .eq("id", taskId)
          .eq("counselor_id", user.id)
          .single();

        if (!task) {
          return NextResponse.json(
            { error: "Task not found" },
            { status: 404 }
          );
        }

        const { data, error } = await supabase
          .from("tasks")
          .update({
            reminder_1day: reminder1day,
            reminder_1hour: reminder1hour,
            reminder_15min: reminder15min,
          })
          .eq("id", taskId)
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { error: `Failed to schedule reminder: ${error.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Tasks tools error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

