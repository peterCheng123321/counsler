import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLORWithAI } from "@/lib/ai/lor-generator";
import { DEMO_USER_ID } from "@/lib/constants";

// GET - List all letters for a student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: letters, error } = await supabase
      .from("letters_of_recommendation")
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching letters:", error);
      return NextResponse.json(
        { error: "Failed to fetch letters", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: letters, success: true });
  } catch (error: any) {
    console.error("Error in GET /api/v1/students/[id]/letters:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create/generate a new letter
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    // Get student data for context
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Generate LOR content using AI if requested
    let generatedContent = body.generated_content || "";

    if (body.generateWithAI) {
      try {
        generatedContent = await generateLORWithAI({
          student,
          programType: body.program_type,
          relationshipType: body.relationship_type,
          relationshipDuration: body.relationship_duration,
          relationshipContext: body.relationship_context,
          specificExamples: body.specific_examples,
        });
      } catch (aiError: any) {
        console.error("AI generation failed:", aiError);
        // Continue without AI-generated content
        generatedContent = "AI generation failed. Please write the letter manually.";
      }
    }

    // Create the letter
    const { data: letter, error: insertError } = await supabase
      .from("letters_of_recommendation")
      .insert({
        student_id: studentId,
        counselor_id: DEMO_USER_ID,
        student_college_id: body.student_college_id || null,
        program_type: body.program_type,
        relationship_type: body.relationship_type,
        relationship_duration: body.relationship_duration,
        relationship_context: body.relationship_context,
        specific_examples: body.specific_examples,
        generated_content: generatedContent,
        status: body.status || "draft",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating letter:", insertError);
      return NextResponse.json(
        { error: "Failed to create letter", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: letter, success: true });
  } catch (error: any) {
    console.error("Error in POST /api/v1/students/[id]/letters:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
