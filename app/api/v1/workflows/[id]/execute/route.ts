import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeWorkflow, type Workflow } from "@/lib/workflow/workflow-executor";
import { DEMO_USER_ID } from "@/lib/constants";

/**
 * POST /api/v1/workflows/[id]/execute - Execute a workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;
    const workflowId = params.id;

    // Fetch workflow
    const { data: workflow, error: fetchError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("counselor_id", userId)
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (!workflow.enabled) {
      return NextResponse.json({ error: "Workflow is disabled" }, { status: 400 });
    }

    // Execute workflow
    console.log(`[Workflow Execute API] Executing workflow: ${workflow.name}`);
    const result = await executeWorkflow(
      {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps,
        enabled: workflow.enabled,
      } as Workflow,
      userId,
      "manual"
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          runId: result.runId,
          results: result.results,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        runId: result.runId,
        results: result.results,
        stepsExecuted: result.results.length,
      },
    });
  } catch (error) {
    console.error("[Workflow Execute API] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
