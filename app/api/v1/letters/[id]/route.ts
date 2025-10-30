import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

const updateLetterSchema = z.object({
  programType: z.string().optional(),
  relationshipType: z.string().optional(),
  relationshipDuration: z.string().optional(),
  relationshipContext: z.string().optional(),
  specificExamples: z.string().optional(),
  generatedContent: z.string().optional(),
  status: z.enum(["draft", "reviewed", "finalized"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("letters_of_recommendation")
      .select(
        `
        id,
        student_id,
        student_college_id,
        program_type,
        relationship_type,
        relationship_duration,
        relationship_context,
        specific_examples,
        generated_content,
        status,
        created_at,
        updated_at,
        students (
          id,
          first_name,
          last_name,
          email,
          graduation_year,
          gpa_unweighted
        ),
        student_colleges (
          id,
          colleges (
            id,
            name,
            location_city,
            location_state
          )
        )
      `
      )
      .eq("id", id)
      .eq("counselor_id", DEMO_USER_ID)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Letter not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching letter:", error);
      return NextResponse.json(
        { error: "Failed to fetch letter", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Unexpected error in GET letter:", error);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const body = await request.json();
    const validatedData = updateLetterSchema.parse(body);

    // Map camelCase to snake_case
    const updateData: Record<string, unknown> = {};
    if (validatedData.programType !== undefined)
      updateData.program_type = validatedData.programType;
    if (validatedData.relationshipType !== undefined)
      updateData.relationship_type = validatedData.relationshipType;
    if (validatedData.relationshipDuration !== undefined)
      updateData.relationship_duration = validatedData.relationshipDuration;
    if (validatedData.relationshipContext !== undefined)
      updateData.relationship_context = validatedData.relationshipContext;
    if (validatedData.specificExamples !== undefined)
      updateData.specific_examples = validatedData.specificExamples;
    if (validatedData.generatedContent !== undefined)
      updateData.generated_content = validatedData.generatedContent;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;

    const { data, error } = await supabase
      .from("letters_of_recommendation")
      .update(updateData)
      .eq("id", id)
      .eq("counselor_id", DEMO_USER_ID)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Letter not found" },
          { status: 404 }
        );
      }
      console.error("Error updating letter:", error);
      return NextResponse.json(
        { error: "Failed to update letter", details: error.message },
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
    console.error("Unexpected error in PATCH letter:", error);
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
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("letters_of_recommendation")
      .delete()
      .eq("id", id)
      .eq("counselor_id", DEMO_USER_ID);

    if (error) {
      console.error("Error deleting letter:", error);
      return NextResponse.json(
        { error: "Failed to delete letter", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in DELETE letter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
