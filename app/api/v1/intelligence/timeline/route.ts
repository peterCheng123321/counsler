import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApplicationTimeline, createTimelineTasks } from "@/lib/intelligence/timeline-generator";
import { z } from "zod";

const requestSchema = z.object({
  studentId: z.string().uuid(),
  autoCreate: z.boolean().optional().default(false),
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
    const { studentId, autoCreate } = requestSchema.parse(body);

    // Verify student belongs to user
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("counselor_id", user.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Generate timeline
    const timeline = await generateApplicationTimeline(studentId);

    // Optionally create tasks in database
    let taskCreationResult = null;
    if (autoCreate) {
      taskCreationResult = await createTimelineTasks(studentId, timeline);
    }

    return NextResponse.json({
      success: true,
      data: {
        timeline,
        taskCreation: taskCreationResult,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Timeline generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate timeline";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
