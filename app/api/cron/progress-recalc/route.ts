import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  // Verify cron secret (Vercel cron protection)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    
    // Get all students
    const { data: students, error } = await supabase
      .from("students")
      .select("id");

    if (error) {
      console.error("Error fetching students:", error);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    // TODO: Recalculate progress for each student
    // This will query student_colleges, essays, etc. and calculate overall progress
    // For now, just return success

    return NextResponse.json({
      success: true,
      studentsProcessed: students?.length || 0,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


