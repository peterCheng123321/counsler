import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    // Fetch all student stats in parallel using Promise.all
    const [collegesRes, essaysRes, lorsRes] = await Promise.all([
      // Get colleges applied to
      supabase
        .from("student_colleges")
        .select("id, deadline")
        .eq("student_id", id),

      // Get essays
      supabase
        .from("essays")
        .select("id, status")
        .eq("student_id", id),

      // Get letters of recommendation (may not exist yet) - handle potential table not existing
      (async () => {
        try {
          const res = await supabase
            .from("letters")
            .select("id")
            .eq("student_id", id);
          return { ...res, data: res.data || [] };
        } catch {
          return { data: [], error: null };
        }
      })(),
    ]);

    // Handle errors
    if (collegesRes.error) {
      console.error("Error fetching colleges:", collegesRes.error);
    }

    if (essaysRes.error) {
      console.error("Error fetching essays:", essaysRes.error);
    }

    // Calculate stats
    const collegesApplied = collegesRes.data?.length || 0;
    const essaysComplete = essaysRes.data?.filter(e => e.status === "completed").length || 0;
    const lorsRequested = lorsRes.data?.length || 0;

    // Find next deadline from colleges
    let nextDeadline: string | null = null;
    if (collegesRes.data && collegesRes.data.length > 0) {
      const deadlines = collegesRes.data
        .filter(c => c.deadline)
        .map(c => c.deadline)
        .sort();

      nextDeadline = deadlines[0] || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        collegesApplied,
        essaysComplete,
        lorsRequested,
        nextDeadline,
      },
    });
  } catch (error) {
    console.error("Error fetching student stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch student stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
