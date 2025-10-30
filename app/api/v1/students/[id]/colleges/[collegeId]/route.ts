import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

const updateStudentCollegeSchema = z.object({
  applicationType: z.enum(["ED", "EA", "RD", "Rolling"]).optional(),
  deadline: z.string().optional(),
  collegeType: z.enum(["Safety", "Target", "Reach"]).optional(),
  applicationStatus: z.string().optional(),
  applicationProgress: z.number().min(0).max(100).optional(),
  applicationPortal: z.string().optional(),
  essaysRequired: z.number().min(0).optional(),
  essaysCompleted: z.number().min(0).optional(),
  lorsRequired: z.number().min(0).optional(),
  lorsCompleted: z.number().min(0).optional(),
  transcriptRequested: z.boolean().optional(),
  transcriptReceived: z.boolean().optional(),
  testScoresSent: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collegeId: string }> }
) {
  try {
    const { id: studentId, collegeId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("student_colleges")
      .select(
        `
        id,
        application_type,
        deadline,
        college_type,
        application_portal,
        application_status,
        application_progress,
        essays_required,
        essays_completed,
        lors_required,
        lors_completed,
        transcript_requested,
        transcript_received,
        test_scores_sent,
        created_at,
        updated_at,
        colleges (
          id,
          name,
          location_city,
          location_state,
          location_country,
          type,
          acceptance_rate,
          logo_url,
          website_url
        )
      `
      )
      .eq("student_id", studentId)
      .eq("id", collegeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Student-college relationship not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching student-college:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch student-college relationship",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Unexpected error in GET student-college:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collegeId: string }> }
) {
  try {
    const { id: studentId, collegeId } = await params;
    const supabase = createAdminClient();
    const body = await request.json();
    const validatedData = updateStudentCollegeSchema.parse(body);

    // Map camelCase to snake_case for database
    const updateData: Record<string, unknown> = {};
    if (validatedData.applicationType !== undefined)
      updateData.application_type = validatedData.applicationType;
    if (validatedData.deadline !== undefined)
      updateData.deadline = validatedData.deadline;
    if (validatedData.collegeType !== undefined)
      updateData.college_type = validatedData.collegeType;
    if (validatedData.applicationStatus !== undefined)
      updateData.application_status = validatedData.applicationStatus;
    if (validatedData.applicationProgress !== undefined)
      updateData.application_progress = validatedData.applicationProgress;
    if (validatedData.applicationPortal !== undefined)
      updateData.application_portal = validatedData.applicationPortal;
    if (validatedData.essaysRequired !== undefined)
      updateData.essays_required = validatedData.essaysRequired;
    if (validatedData.essaysCompleted !== undefined)
      updateData.essays_completed = validatedData.essaysCompleted;
    if (validatedData.lorsRequired !== undefined)
      updateData.lors_required = validatedData.lorsRequired;
    if (validatedData.lorsCompleted !== undefined)
      updateData.lors_completed = validatedData.lorsCompleted;
    if (validatedData.transcriptRequested !== undefined)
      updateData.transcript_requested = validatedData.transcriptRequested;
    if (validatedData.transcriptReceived !== undefined)
      updateData.transcript_received = validatedData.transcriptReceived;
    if (validatedData.testScoresSent !== undefined)
      updateData.test_scores_sent = validatedData.testScoresSent;

    const { data, error } = await supabase
      .from("student_colleges")
      .update(updateData)
      .eq("id", collegeId)
      .eq("student_id", studentId)
      .select(
        `
        id,
        application_type,
        deadline,
        college_type,
        application_portal,
        application_status,
        application_progress,
        essays_required,
        essays_completed,
        lors_required,
        lors_completed,
        transcript_requested,
        transcript_received,
        test_scores_sent,
        updated_at,
        colleges (
          id,
          name,
          location_city,
          location_state
        )
      `
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Student-college relationship not found" },
          { status: 404 }
        );
      }
      console.error("Error updating student-college:", error);
      return NextResponse.json(
        {
          error: "Failed to update student-college relationship",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Unexpected error in PATCH student-college:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collegeId: string }> }
) {
  try {
    const { id: studentId, collegeId } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("student_colleges")
      .delete()
      .eq("id", collegeId)
      .eq("student_id", studentId);

    if (error) {
      console.error("Error deleting student-college:", error);
      return NextResponse.json(
        {
          error: "Failed to remove college from student",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in DELETE student-college:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
