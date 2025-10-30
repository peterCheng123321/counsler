/**
 * TEMPORARY ADMIN ENDPOINT
 * Fixes agent tables RLS for demo mode
 * Run this once, then delete this file
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = createAdminClient();

    console.log("Fixing agent tables RLS...");

    // Disable RLS for agent tables
    const fixes = [
      "ALTER TABLE IF EXISTS agent_config DISABLE ROW LEVEL SECURITY",
      "ALTER TABLE IF EXISTS agent_runs DISABLE ROW LEVEL SECURITY",
      "ALTER TABLE IF EXISTS agent_insights DISABLE ROW LEVEL SECURITY",
    ];

    const results = [];

    for (const sql of fixes) {
      try {
        // Try using raw SQL via admin client
        const { error } = await supabase.rpc("exec_sql", { sql_string: sql });

        if (error) {
          results.push({ sql, status: "may have failed", error: error.message });
        } else {
          results.push({ sql, status: "success" });
        }
      } catch (err: any) {
        results.push({ sql, status: "error", error: err.message });
      }
    }

    // Now try to verify tables exist and are accessible
    const verifications = [];

    // Check agent_config
    try {
      const { data, error } = await supabase
        .from("agent_config")
        .select("count")
        .limit(1);

      verifications.push({
        table: "agent_config",
        accessible: !error,
        error: error?.message,
      });
    } catch (err: any) {
      verifications.push({
        table: "agent_config",
        accessible: false,
        error: err.message,
      });
    }

    // Check agent_runs
    try {
      const { data, error } = await supabase
        .from("agent_runs")
        .select("count")
        .limit(1);

      verifications.push({
        table: "agent_runs",
        accessible: !error,
        error: error?.message,
      });
    } catch (err: any) {
      verifications.push({
        table: "agent_runs",
        accessible: false,
        error: err.message,
      });
    }

    // Check agent_insights
    try {
      const { data, error } = await supabase
        .from("agent_insights")
        .select("count")
        .limit(1);

      verifications.push({
        table: "agent_insights",
        accessible: !error,
        error: error?.message,
      });
    } catch (err: any) {
      verifications.push({
        table: "agent_insights",
        accessible: false,
        error: err.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Agent RLS fix attempted",
      results,
      verifications,
      instructions: verifications.some(v => !v.accessible)
        ? "Some tables are not accessible. Please run the SQL manually in Supabase Dashboard SQL Editor: supabase/migrations/20251030230000_disable_rls_agent_tables.sql"
        : "All tables accessible!",
    });
  } catch (error) {
    console.error("Fix agent RLS error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix agent RLS",
        details: error instanceof Error ? error.message : "Unknown error",
        instructions:
          "Please manually run SQL in Supabase Dashboard SQL Editor from: supabase/migrations/20251030230000_disable_rls_agent_tables.sql",
      },
      { status: 500 }
    );
  }
}
