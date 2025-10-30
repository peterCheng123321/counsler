/**
 * Agent Configuration API
 * Manage agent settings with validation to prevent backend overload
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateAgentConfig } from "@/lib/ai/agent-scheduler";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

// Validation schema with safety limits
const configUpdateSchema = z.object({
  daily_digest_enabled: z.boolean().optional(),
  daily_digest_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  deadline_monitor_enabled: z.boolean().optional(),
  deadline_monitor_interval_hours: z.number().min(6).max(24).optional(), // Min 6 hours to prevent spam
  risk_assessment_enabled: z.boolean().optional(),
  risk_assessment_interval_hours: z.number().min(12).max(168).optional(), // Min 12 hours, max 1 week
  max_runs_per_hour: z.number().min(1).max(10).optional(), // Max 10 runs/hour to prevent overload
  max_insights_per_run: z.number().min(1).max(20).optional(), // Max 20 insights
  autonomous_actions_enabled: z.boolean().optional(),
  notification_preferences: z.object({
    email: z.boolean().optional(),
    in_app: z.boolean().optional(),
  }).optional(),
});

/**
 * GET /api/v1/agent/config
 * Get current agent configuration
 */
export async function GET(request: NextRequest) {
  try {
    const counselorId = DEMO_USER_ID;

    const config = await getOrCreateAgentConfig(counselorId);

    if (!config) {
      return NextResponse.json(
        { error: "Failed to get configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("[Agent Config API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent configuration" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/agent/config
 * Update agent configuration with validation
 */
export async function PUT(request: NextRequest) {
  try {
    const counselorId = DEMO_USER_ID;

    // Parse and validate request body
    const body = await request.json();
    const updates = configUpdateSchema.parse(body);

    // Additional safety checks
    if (updates.max_runs_per_hour && updates.max_runs_per_hour > 10) {
      return NextResponse.json(
        { error: "max_runs_per_hour cannot exceed 10 to prevent backend overload" },
        { status: 400 }
      );
    }

    if (updates.deadline_monitor_interval_hours && updates.deadline_monitor_interval_hours < 6) {
      return NextResponse.json(
        { error: "deadline_monitor_interval_hours must be at least 6 hours" },
        { status: 400 }
      );
    }

    if (updates.risk_assessment_interval_hours && updates.risk_assessment_interval_hours < 12) {
      return NextResponse.json(
        { error: "risk_assessment_interval_hours must be at least 12 hours" },
        { status: 400 }
      );
    }

    // Update configuration
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agent_config")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("counselor_id", counselorId)
      .select()
      .single();

    if (error) {
      console.error("[Agent Config API] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: data,
      message: "Configuration updated successfully",
    });
  } catch (error) {
    console.error("[Agent Config API] PUT error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update agent configuration" },
      { status: 500 }
    );
  }
}
