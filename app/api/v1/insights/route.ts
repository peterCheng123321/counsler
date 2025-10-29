/**
 * Insights API Route
 * Handles CRUD operations for AI-generated insights
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createInsight,
  getInsightsByEntity,
  getUserInsights,
  updateInsight,
  deleteInsight,
} from "@/lib/insights";
import { z } from "zod";

const createInsightSchema = z.object({
  entityType: z.enum(["student", "task", "cohort", "workspace"]),
  entityId: z.string().uuid().optional().nullable(),
  kind: z.enum([
    "risk_score",
    "workload_forecast",
    "anomaly",
    "summary",
    "recommendation",
    "trend",
    "lor_draft",
  ]),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const updateInsightSchema = z.object({
  insightId: z.string().uuid(),
  content: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType") as
      | "student"
      | "task"
      | "cohort"
      | "workspace"
      | null;
    const entityId = searchParams.get("entityId");
    const kind = searchParams.get("kind") as any;
    const limit = searchParams.get("limit");

    if (entityType) {
      const insights = await getInsightsByEntity(
        entityType,
        entityId || null,
        kind || undefined
      );
      return NextResponse.json({ success: true, data: insights });
    } else {
      const insights = await getUserInsights(
        kind || undefined,
        limit ? parseInt(limit) : undefined
      );
      return NextResponse.json({ success: true, data: insights });
    }
  } catch (error) {
    console.error("Get insights error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === "create") {
      const validated = createInsightSchema.parse(params);
      const insight = await createInsight({
        entity_type: validated.entityType,
        entity_id: validated.entityId || null,
        kind: validated.kind,
        content: validated.content,
        metadata: validated.metadata,
      });

      return NextResponse.json({ success: true, data: insight }, { status: 201 });
    } else if (action === "update") {
      const { insightId, ...updates } = updateInsightSchema.parse(params);
      const insight = await updateInsight(insightId, updates);
      return NextResponse.json({ success: true, data: insight });
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Create/update insight error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const insightId = searchParams.get("insightId");

    if (!insightId) {
      return NextResponse.json(
        { error: "insightId is required" },
        { status: 400 }
      );
    }

    await deleteInsight(insightId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete insight error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

