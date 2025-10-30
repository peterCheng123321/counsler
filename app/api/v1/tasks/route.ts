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

    // For demo purposes: Allow all users to access all mock data
    // Remove counselor_id filter to show all tasks in database
    let query = supabase
      .from("tasks")
      .select("*")
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

    const { data: tasks, error } = await query;

    if (error) {
      console.error("Tasks query error:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch tasks",
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    // Fetch students for tasks that have student_id
    const studentIds = (tasks || [])
      .map(task => task.student_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let studentsMap: Record<string, any> = {};
    if (studentIds.length > 0) {
      // For demo: Fetch all students, not just ones matching counselor_id
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
    const tasksWithStudents = (tasks || []).map(task => ({
      ...task,
      students: task.student_id ? studentsMap[task.student_id] || null : null,
    }));

    // For demo purposes, all users can access any data in the database
    // Mock data should already be in DB, so we return what we found

    // Cache the result
    queryCache.set(user.id, "tasks", tasksWithStudents, cacheKey);

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

    const { data: task, error } = await supabase
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
        .eq("counselor_id", user.id)
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
    queryCache.invalidateUser(user.id);

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

