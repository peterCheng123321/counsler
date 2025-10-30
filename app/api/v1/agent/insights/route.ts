/**
 * Agent Insights API
 * Fetch and manage AI-generated insights
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

/**
 * GET /api/v1/agent/insights
 * Get active insights for the counselor
 * Optional filters: status, priority, category
 */
export async function GET(request: NextRequest) {
  try {
    const counselorId = DEMO_USER_ID;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || "active";
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = createAdminClient();

    let query = supabase
      .from("agent_insights")
      .select(`
        *,
        agent_runs (
          run_type,
          started_at
        )
      `)
      .eq("counselor_id", counselorId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Add optional filters
    if (priority) {
      query = query.eq("priority", priority);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data: insights, error } = await query;

    if (error) {
      console.error("[Agent Insights API] GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch insights" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      insights,
      count: insights?.length || 0,
    });
  } catch (error) {
    console.error("[Agent Insights API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent insights" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/agent/insights/:id
 * Update insight status (dismiss, act on)
 */
export async function PATCH(request: NextRequest) {
  try {
    const counselorId = DEMO_USER_ID;
    const body = await request.json();
    const { insightId, status } = body;

    if (!insightId || !status) {
      return NextResponse.json(
        { error: "insightId and status are required" },
        { status: 400 }
      );
    }

    if (!["active", "dismissed", "acted_on"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: active, dismissed, or acted_on" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: any = {
      status,
    };

    if (status === "dismissed") {
      updateData.dismissed_at = new Date().toISOString();
    } else if (status === "acted_on") {
      updateData.acted_on_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("agent_insights")
      .update(updateData)
      .eq("id", insightId)
      .eq("counselor_id", counselorId)
      .select()
      .single();

    if (error) {
      console.error("[Agent Insights API] PATCH error:", error);
      return NextResponse.json(
        { error: "Failed to update insight" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      insight: data,
    });
  } catch (error) {
    console.error("[Agent Insights API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update agent insight" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/agent/insights/:id
 * Delete an insight
 */
export async function DELETE(request: NextRequest) {
  try {
    const counselorId = DEMO_USER_ID;
    const { searchParams } = new URL(request.url);
    const insightId = searchParams.get("id");

    if (!insightId) {
      return NextResponse.json(
        { error: "insightId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("agent_insights")
      .delete()
      .eq("id", insightId)
      .eq("counselor_id", counselorId);

    if (error) {
      console.error("[Agent Insights API] DELETE error:", error);
      return NextResponse.json(
        { error: "Failed to delete insight" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Insight deleted successfully",
    });
  } catch (error) {
    console.error("[Agent Insights API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete agent insight" },
      { status: 500 }
    );
  }
}
