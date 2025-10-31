/**
 * Update Agent Insight Status
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["active", "dismissed", "acted_on"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: active, dismissed, or acted_on" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: any = { status };

    if (status === "dismissed") {
      updateData.dismissed_at = new Date().toISOString();
    } else if (status === "acted_on") {
      updateData.acted_on_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("agent_insights")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("[Agent Insights API] Error updating insight:", error);
      return NextResponse.json(
        { error: "Failed to update insight" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Agent Insights API] Error:", error);
    return NextResponse.json(
      { error: "Failed to update insight" },
      { status: 500 }
    );
  }
}
