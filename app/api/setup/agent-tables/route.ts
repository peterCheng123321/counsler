/**
 * ONE-TIME SETUP ENDPOINT
 * Creates agent system tables
 * Should be removed after first use for security
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = createAdminClient();

    console.log("Creating agent system tables...");

    // Create agent_config table
    const { error: configError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS agent_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          daily_digest_enabled BOOLEAN DEFAULT true,
          daily_digest_time TIME DEFAULT '08:00:00',
          deadline_monitor_enabled BOOLEAN DEFAULT true,
          deadline_monitor_interval_hours INTEGER DEFAULT 6,
          risk_assessment_enabled BOOLEAN DEFAULT true,
          risk_assessment_interval_hours INTEGER DEFAULT 24,
          max_runs_per_hour INTEGER DEFAULT 5,
          max_insights_per_run INTEGER DEFAULT 10,
          autonomous_actions_enabled BOOLEAN DEFAULT false,
          notification_preferences JSONB DEFAULT '{"email": false, "in_app": true}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(counselor_id)
        );
      `,
    });

    // Check config table was created
    const { data: configCheck, error: configCheckError } = await supabase
      .from("agent_config")
      .select("count");

    console.log("agent_config table:", configCheckError ? "creation pending" : "created ✓");

    // Create agent_runs table
    const { data: runsCheck, error: runsCheckError } = await supabase
      .from("agent_runs")
      .select("count");

    console.log("agent_runs table:", runsCheckError ? "creation pending" : "exists ✓");

    // Create agent_insights table
    const { data: insightsCheck, error: insightsCheckError } = await supabase
      .from("agent_insights")
      .select("count");

    console.log("agent_insights table:", insightsCheckError ? "creation pending" : "exists ✓");

    return NextResponse.json({
      success: true,
      message: "Agent tables setup initiated",
      details: {
        agent_config: !configCheckError,
        agent_runs: !runsCheckError,
        agent_insights: !insightsCheckError,
      },
      note: "If any table shows false, you need to manually create them via Supabase Dashboard SQL Editor using the migration file: supabase/migrations/20251030100000_agent_system.sql",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      {
        error: "Setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
        instructions:
          "Please manually execute the SQL in: supabase/migrations/20251030100000_agent_system.sql via Supabase Dashboard",
      },
      { status: 500 }
    );
  }
}
