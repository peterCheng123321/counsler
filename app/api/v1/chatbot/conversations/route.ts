import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    // Demo mode: Use admin client to bypass RLS
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("counselor_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: conversations || [], success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

