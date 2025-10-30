import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");

    let query = supabase
      .from("letters_of_recommendation")
      .select(
        `
        id,
        student_id,
        student_college_id,
        program_type,
        relationship_type,
        relationship_duration,
        generated_content,
        status,
        created_at,
        updated_at,
        students (
          id,
          first_name,
          last_name,
          email,
          graduation_year
        )
      `
      )
      .eq("counselor_id", DEMO_USER_ID)
      .order("created_at", { ascending: false });

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching letters:", error);
      return NextResponse.json(
        { error: "Failed to fetch letters", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Unexpected error in GET letters:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
