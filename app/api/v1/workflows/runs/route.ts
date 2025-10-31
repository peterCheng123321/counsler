import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

/**
 * GET /api/v1/workflows/runs - List all workflow runs
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("workflow_runs")
      .select(`
        *,
        workflows (
          id,
          name,
          description
        )
      `)
      .eq("counselor_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (workflowId) {
      query = query.eq("workflow_id", workflowId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Workflow Runs API] Error fetching runs:", error);
      return NextResponse.json({ error: "Failed to fetch workflow runs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Workflow Runs API] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
