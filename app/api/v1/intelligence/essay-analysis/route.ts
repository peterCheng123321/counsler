import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeEssay, saveEssayAnalysis } from "@/lib/intelligence/essay-analyzer";
import { z } from "zod";

const requestSchema = z.object({
  essayId: z.string().uuid(),
  essayContent: z.string().min(50),
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
    const { essayId, essayContent } = requestSchema.parse(body);

    // Verify essay belongs to user's student
    const { data: essay, error: essayError } = await supabase
      .from("essays")
      .select(`
        id,
        students!inner (
          counselor_id
        )
      `)
      .eq("id", essayId)
      .single();

    if (essayError || !essay) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }

    // Check ownership
    const student = Array.isArray(essay.students) ? essay.students[0] : essay.students;
    if (student.counselor_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Analyze essay
    const analysis = await analyzeEssay(essayContent);

    // Save analysis
    await saveEssayAnalysis(essayId, analysis);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Essay analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze essay";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
