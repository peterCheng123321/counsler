/**
 * Agent Scheduler with Rate Limiting
 * Prevents backend overload with configurable limits
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface AgentConfig {
  id: string;
  counselor_id: string;
  daily_digest_enabled: boolean;
  daily_digest_time: string;
  deadline_monitor_enabled: boolean;
  deadline_monitor_interval_hours: number;
  risk_assessment_enabled: boolean;
  risk_assessment_interval_hours: number;
  max_runs_per_hour: number;
  max_insights_per_run: number;
  autonomous_actions_enabled: boolean;
}

interface AgentRun {
  id: string;
  run_type: string;
  status: string;
  started_at: string;
}

/**
 * Check if agent can run (rate limiting)
 */
export async function canRunAgent(
  counselorId: string,
  runType: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = createAdminClient();

    // Get agent config
    const { data: config, error: configError } = await supabase
      .from("agent_config")
      .select("*")
      .eq("counselor_id", counselorId)
      .single();

    if (configError || !config) {
      return { allowed: false, reason: "Agent not configured" };
    }

    // Check if this run type is enabled
    const enabledMap: Record<string, boolean> = {
      daily_digest: config.daily_digest_enabled,
      deadline_monitor: config.deadline_monitor_enabled,
      risk_assessment: config.risk_assessment_enabled,
    };

    if (runType !== "manual" && !enabledMap[runType]) {
      return { allowed: false, reason: `${runType} is disabled` };
    }

    // Check rate limit (runs per hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: recentRuns, error: runsError } = await supabase
      .from("agent_runs")
      .select("id")
      .eq("counselor_id", counselorId)
      .gte("started_at", oneHourAgo.toISOString());

    if (runsError) {
      console.error("[Agent Scheduler] Error checking recent runs:", runsError);
      return { allowed: false, reason: "Error checking rate limit" };
    }

    if (recentRuns && recentRuns.length >= config.max_runs_per_hour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${recentRuns.length}/${config.max_runs_per_hour} runs in the last hour`,
      };
    }

    // Check for duplicate running jobs
    const { data: runningJobs, error: runningError } = await supabase
      .from("agent_runs")
      .select("id, run_type")
      .eq("counselor_id", counselorId)
      .eq("run_type", runType)
      .eq("status", "running");

    if (runningError) {
      console.error("[Agent Scheduler] Error checking running jobs:", runningError);
      return { allowed: false, reason: "Error checking running jobs" };
    }

    if (runningJobs && runningJobs.length > 0) {
      return {
        allowed: false,
        reason: `Job already running: ${runType}`,
      };
    }

    // Check interval for periodic jobs
    if (runType !== "manual") {
      const intervalHours =
        runType === "deadline_monitor"
          ? config.deadline_monitor_interval_hours
          : runType === "risk_assessment"
          ? config.risk_assessment_interval_hours
          : 24; // daily_digest default

      const lastRunTime = new Date();
      lastRunTime.setHours(lastRunTime.getHours() - intervalHours);

      const { data: lastRun, error: lastRunError } = await supabase
        .from("agent_runs")
        .select("started_at")
        .eq("counselor_id", counselorId)
        .eq("run_type", runType)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!lastRunError && lastRun) {
        const lastRunDate = new Date(lastRun.started_at);
        const timeSinceLastRun = Date.now() - lastRunDate.getTime();
        const requiredInterval = intervalHours * 60 * 60 * 1000;

        if (timeSinceLastRun < requiredInterval) {
          const minutesRemaining = Math.ceil(
            (requiredInterval - timeSinceLastRun) / (60 * 1000)
          );
          return {
            allowed: false,
            reason: `Too soon. Wait ${minutesRemaining} minutes before next run`,
          };
        }
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("[Agent Scheduler] Error in canRunAgent:", error);
    return { allowed: false, reason: "Internal error" };
  }
}

/**
 * Create agent run record
 */
export async function createAgentRun(
  counselorId: string,
  runType: string
): Promise<{ success: boolean; runId?: string; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("agent_runs")
      .insert({
        counselor_id: counselorId,
        run_type: runType,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Agent Scheduler] Error creating run:", error);
      return { success: false, error: error.message };
    }

    return { success: true, runId: data.id };
  } catch (error) {
    console.error("[Agent Scheduler] Error in createAgentRun:", error);
    return { success: false, error: "Failed to create run" };
  }
}

/**
 * Complete agent run
 */
export async function completeAgentRun(
  runId: string,
  results: {
    status: "completed" | "failed";
    insightsCount?: number;
    toolsUsed?: string[];
    executionTimeMs?: number;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase
      .from("agent_runs")
      .update({
        status: results.status,
        insights_count: results.insightsCount || 0,
        tools_used: results.toolsUsed || [],
        execution_time_ms: results.executionTimeMs,
        error_message: results.errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
  } catch (error) {
    console.error("[Agent Scheduler] Error completing run:", error);
  }
}

/**
 * Store agent insight
 */
export async function storeAgentInsight(
  runId: string,
  counselorId: string,
  insight: {
    category: string;
    priority: "high" | "medium" | "low";
    finding: string;
    recommendation: string;
  },
  expiresInDays: number = 7
): Promise<{ success: boolean }> {
  try {
    const supabase = createAdminClient();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { error } = await supabase.from("agent_insights").insert({
      agent_run_id: runId,
      counselor_id: counselorId,
      category: insight.category,
      priority: insight.priority,
      finding: insight.finding,
      recommendation: insight.recommendation,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("[Agent Scheduler] Error storing insight:", error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("[Agent Scheduler] Error in storeAgentInsight:", error);
    return { success: false };
  }
}

/**
 * Get agent config for counselor (create if not exists)
 */
export async function getOrCreateAgentConfig(
  counselorId: string
): Promise<AgentConfig | null> {
  try {
    const supabase = createAdminClient();

    // Try to get existing config
    const { data: existing, error: selectError } = await supabase
      .from("agent_config")
      .select("*")
      .eq("counselor_id", counselorId)
      .single();

    if (existing) {
      return existing as AgentConfig;
    }

    // Create default config if not exists
    const { data: created, error: insertError } = await supabase
      .from("agent_config")
      .insert({
        counselor_id: counselorId,
        // All defaults are in the database schema
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[Agent Scheduler] Error creating config:", insertError);
      return null;
    }

    return created as AgentConfig;
  } catch (error) {
    console.error("[Agent Scheduler] Error in getOrCreateAgentConfig:", error);
    return null;
  }
}

/**
 * Clean up expired insights (run periodically to prevent bloat)
 */
export async function cleanupExpiredInsights(): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.rpc("cleanup_expired_insights");

    console.log("[Agent Scheduler] Cleaned up expired insights");
  } catch (error) {
    console.error("[Agent Scheduler] Error cleaning up insights:", error);
  }
}
