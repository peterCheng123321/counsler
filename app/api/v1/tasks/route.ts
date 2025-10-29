import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryCache } from "@/lib/cache/query-cache";
import { z } from "zod";

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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const studentId = searchParams.get("studentId");
    const dueDateFrom = searchParams.get("dueDateFrom");
    const dueDateTo = searchParams.get("dueDateTo");

    // Check cache
    const cacheKey = {
      status: status || undefined,
      priority: priority || undefined,
      studentId: studentId || undefined,
      dueDateFrom: dueDateFrom || undefined,
      dueDateTo: dueDateTo || undefined,
    };
    const cached = queryCache.get(user.id, "tasks", cacheKey);
    if (cached) {
      return NextResponse.json({ data: cached, success: true });
    }

    let query = supabase
      .from("tasks")
      .select(`
        *,
        students (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("counselor_id", user.id)
      .order("due_date", { ascending: true })
      .order("due_time", { ascending: true, nullsFirst: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    if (dueDateFrom) {
      query = query.gte("due_date", dueDateFrom);
    }

    if (dueDateTo) {
      query = query.lte("due_date", dueDateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    // Cache the result
    queryCache.set(user.id, "tasks", data || [], cacheKey);

    return NextResponse.json({ data: data || [], success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const validatedData = taskSchema.parse(body);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        counselor_id: user.id,
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
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create task" },
        { status: 500 }
      );
    }

    // Invalidate cache
    queryCache.invalidateUser(user.id);

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

