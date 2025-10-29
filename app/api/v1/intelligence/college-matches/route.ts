import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findCollegeMatches, generateBalancedCollegeList } from "@/lib/intelligence/college-matcher";
import { z } from "zod";

const requestSchema = z.object({
  studentId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  balanced: z.boolean().optional().default(false),
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
    const { studentId, limit, balanced } = requestSchema.parse(body);

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

    // Get matches
    let result;
    if (balanced) {
      result = await generateBalancedCollegeList(studentId);
    } else {
      const matches = await findCollegeMatches(studentId, limit);
      result = { matches };
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("College match error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to find college matches";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
