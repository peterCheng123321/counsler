import { NextRequest, NextResponse } from "next/server";
import { workflowTemplates, getTemplatesByCategory, getTemplateCategories } from "@/lib/workflow/workflow-templates";

/**
 * GET /api/v1/workflows/templates - List all workflow templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const templates = category
      ? getTemplatesByCategory(category)
      : workflowTemplates;

    const categories = getTemplateCategories();

    return NextResponse.json({
      success: true,
      data: {
        templates: templates.map((t) => ({
          name: t.name,
          description: t.description,
          category: t.category,
          triggerType: t.triggerType,
          stepCount: t.steps.length,
          steps: t.steps.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
          })),
        })),
        categories,
      },
    });
  } catch (error) {
    console.error("[Workflow Templates API] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
