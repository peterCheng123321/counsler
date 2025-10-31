import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const supabase = createAdminClient();

    // Fetch essays for the student
    const { data: essays, error } = await supabase
      .from("essays")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching essays:", error);
      return NextResponse.json(
        { error: "Failed to fetch essays", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: essays || [], success: true });
  } catch (error) {
    console.error("Unexpected error in GET essays:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const { title, content, prompt, college_id } = body;

    // Create new essay
    const { data: essay, error } = await supabase
      .from("essays")
      .insert({
        student_id: studentId,
        counselor_id: userId,
        title: title || "Untitled Essay",
        content: content || "",
        prompt: prompt || null,
        college_id: college_id || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating essay:", error);
      return NextResponse.json(
        { error: "Failed to create essay", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: essay, success: true }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST essay:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
