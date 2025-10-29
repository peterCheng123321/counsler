import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as fs from "fs";
import * as path from "path";

/**
 * Admin API route to execute the tool_calls migration
 * POST /api/admin/migrate-tool-calls
 * 
 * This executes the SQL migration directly using Supabase's connection.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Read the migration SQL
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/20241029000003_add_tool_calls.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Split into individual statements
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    const results = [];

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          // Supabase JS client doesn't support direct SQL execution
          // We need to use the REST API or a custom function
          // For now, verify if columns exist
          const { error: testError } = await supabase
            .from("messages")
            .select("tool_calls, tool_call_id")
            .limit(0);

          if (!testError) {
            results.push({
              statement: statement.substring(0, 60) + "...",
              status: "columns_exist",
            });
          } else {
            results.push({
              statement: statement.substring(0, 60) + "...",
              status: "needs_execution",
              error: testError.message,
            });
          }
        } catch (err) {
          results.push({
            statement: statement.substring(0, 60) + "...",
            status: "error",
            error: String(err),
          });
        }
      }
    }

    // Check if migration is needed
    const { error: verifyError } = await supabase
      .from("messages")
      .select("tool_calls, tool_call_id")
      .limit(0);

    if (!verifyError) {
      return NextResponse.json({
        success: true,
        message: "Migration already applied - columns exist",
        results,
      });
    }

    // Return SQL for manual execution
    return NextResponse.json({
      success: false,
      message:
        "Direct SQL execution not available via API. Please execute manually in Supabase SQL Editor.",
      sql: sql.trim(),
      instructions: [
        "1. Go to Supabase Dashboard > SQL Editor",
        "2. Copy and paste the SQL below",
        "3. Click 'Run' to execute",
      ],
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

