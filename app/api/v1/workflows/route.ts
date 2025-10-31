import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

const workflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["query", "filter", "create", "update", "notify", "ai_analyze", "conditional", "delay"]),
  config: z.record(z.any()),
  dependsOn: z.array(z.string()).optional(),
  continueOnError: z.boolean().optional(),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  triggerType: z.enum(["manual", "scheduled", "event"]).default("manual"),
  triggerConfig: z.record(z.any()).optional(),
  steps: z.array(workflowStepSchema).min(1),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/v1/workflows - List all workflows
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("counselor_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Workflows API] Error fetching workflows:", error);
      return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Workflows API] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/workflows - Create a new workflow
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const validated = createWorkflowSchema.parse(body);

    const { data, error } = await supabase
      .from("workflows")
      .insert({
        counselor_id: userId,
        name: validated.name,
        description: validated.description,
        trigger_type: validated.triggerType,
        trigger_config: validated.triggerConfig || {},
        steps: validated.steps,
        enabled: validated.enabled,
      })
      .select()
      .single();

    if (error) {
      console.error("[Workflows API] Error creating workflow:", error);
      return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[Workflows API] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
