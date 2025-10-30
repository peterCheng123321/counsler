/**
 * Background Agent Runner API
 * Can be triggered by cron jobs or manually
 * Includes rate limiting and error handling
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runLangGraphAgent } from "@/lib/ai/langgraph-agent";
import {
  canRunAgent,
  createAgentRun,
  completeAgentRun,
  storeAgentInsight,
  getOrCreateAgentConfig,
} from "@/lib/ai/agent-scheduler";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

const runAgentSchema = z.object({
  runType: z.enum(["daily_digest", "deadline_monitor", "risk_assessment", "manual"]),
  counselorId: z.string().uuid().optional(), // Optional, defaults to demo user
});

/**
 * POST /api/cron/agent-run
 * Run background agent with rate limiting
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request
    const body = await request.json();
    const { runType, counselorId: requestCounselorId } = runAgentSchema.parse(body);

    const counselorId = requestCounselorId || DEMO_USER_ID;

    console.log(`[Background Agent] Starting ${runType} run for ${counselorId}`);

    // Get or create agent config
    const config = await getOrCreateAgentConfig(counselorId);
    if (!config) {
      return NextResponse.json(
        { error: "Failed to get agent configuration" },
        { status: 500 }
      );
    }

    // Check if agent can run (rate limiting)
    const { allowed, reason } = await canRunAgent(counselorId, runType);
    if (!allowed) {
      console.log(`[Background Agent] Run blocked: ${reason}`);
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          reason,
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Create agent run record
    const { success, runId, error } = await createAgentRun(counselorId, runType);
    if (!success || !runId) {
      return NextResponse.json(
        { error: error || "Failed to create run" },
        { status: 500 }
      );
    }

    // Build query based on run type
    const queries: Record<string, string> = {
      daily_digest:
        "Generate a daily digest: analyze student progress, upcoming deadlines this week, and task completion trends. Provide actionable insights.",
      deadline_monitor:
        "Monitor deadlines: check all upcoming deadlines in the next 7 days, identify any critical or urgent items, and assess workload conflicts.",
      risk_assessment:
        "Risk assessment: identify students who may be falling behind, analyze task completion rates, and flag any concerning trends.",
      manual: "Analyze current state and provide insights on students, tasks, and deadlines.",
    };

    const query = queries[runType];

    try {
      // Run LangGraph agent
      console.log(`[Background Agent] Executing query: ${query}`);

      const result = await runLangGraphAgent(
        query,
        [], // No conversation history for background runs
        `background-${runType}-${runId}`
      );

      console.log(`[Background Agent] Agent completed. Response length: ${result.response.length}`);

      // Store insights (with max limit to prevent overload)
      let storedCount = 0;
      if (result.insights && result.insights.length > 0) {
        const maxInsights = Math.min(
          result.insights.length,
          config.max_insights_per_run
        );

        for (let i = 0; i < maxInsights; i++) {
          const insight = result.insights[i];
          const stored = await storeAgentInsight(runId, counselorId, insight);
          if (stored.success) {
            storedCount++;
          }
        }

        console.log(`[Background Agent] Stored ${storedCount}/${result.insights.length} insights`);
      }

      // Extract tool names from results
      const toolsUsed = result.toolResults?.map((t) => t.toolName) || [];

      // Complete the run
      const executionTime = Date.now() - startTime;
      await completeAgentRun(runId, {
        status: "completed",
        insightsCount: storedCount,
        toolsUsed,
        executionTimeMs: executionTime,
      });

      console.log(`[Background Agent] Run completed in ${executionTime}ms`);

      return NextResponse.json({
        success: true,
        runId,
        runType,
        insightsGenerated: storedCount,
        toolsUsed,
        executionTimeMs: executionTime,
      });
    } catch (agentError) {
      // Agent execution failed
      console.error("[Background Agent] Agent execution error:", agentError);

      const executionTime = Date.now() - startTime;
      await completeAgentRun(runId, {
        status: "failed",
        errorMessage:
          agentError instanceof Error ? agentError.message : "Unknown error",
        executionTimeMs: executionTime,
      });

      return NextResponse.json(
        {
          error: "Agent execution failed",
          details: agentError instanceof Error ? agentError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Background Agent] Request error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to run background agent",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/agent-run
 * Get agent run status and recent runs
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const counselorId = DEMO_USER_ID;

    // Get recent runs (last 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: recentRuns, error } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("counselor_id", counselorId)
      .gte("started_at", yesterday.toISOString())
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch runs" },
        { status: 500 }
      );
    }

    // Get agent config
    const config = await getOrCreateAgentConfig(counselorId);

    return NextResponse.json({
      success: true,
      config,
      recentRuns,
      runsLast24h: recentRuns?.length || 0,
    });
  } catch (error) {
    console.error("[Background Agent] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get agent status" },
      { status: 500 }
    );
  }
}
