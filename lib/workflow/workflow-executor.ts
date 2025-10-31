/**
 * Workflow Executor - Executes multi-step workflows with real actions
 *
 * Supported step types:
 * - query: Query database (students, tasks)
 * - filter: Filter results based on conditions
 * - create: Create records (tasks, students)
 * - update: Update existing records
 * - notify: Send notifications
 * - ai_analyze: Use AI to analyze data
 * - conditional: Branch based on conditions
 * - delay: Wait for specified time
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { runLangGraphAgent } from "@/lib/ai/langgraph-agent";
import { HumanMessage } from "@langchain/core/messages";

export interface WorkflowStep {
  id: string;
  name: string;
  type: "query" | "filter" | "create" | "update" | "notify" | "ai_analyze" | "conditional" | "delay";
  config: Record<string, any>;
  dependsOn?: string[]; // Step IDs this step depends on
  continueOnError?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  enabled: boolean;
}

export interface WorkflowRunContext {
  workflowId: string;
  workflowRunId: string;
  counselorId: string;
  stepResults: Map<string, any>; // Maps step ID to result
}

/**
 * Execute a complete workflow
 */
export async function executeWorkflow(
  workflow: Workflow,
  counselorId: string,
  triggerType: string = "manual"
): Promise<{ success: boolean; runId: string; results: any[]; error?: string }> {
  const supabase = createAdminClient();
  const startTime = Date.now();

  // Create workflow run record
  const { data: workflowRun, error: runError } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_id: workflow.id,
      counselor_id: counselorId,
      trigger_type: triggerType,
      status: "running",
      current_step: 0,
      total_steps: workflow.steps.length,
    })
    .select("id")
    .single();

  if (runError || !workflowRun) {
    console.error("[Workflow Executor] Failed to create workflow run:", runError);
    return { success: false, runId: "", results: [], error: "Failed to create workflow run" };
  }

  const runId = workflowRun.id;
  const context: WorkflowRunContext = {
    workflowId: workflow.id,
    workflowRunId: runId,
    counselorId,
    stepResults: new Map(),
  };

  const results: any[] = [];
  let error: string | undefined;

  try {
    // Execute each step in sequence
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];

      console.log(`[Workflow Executor] Executing step ${i + 1}/${workflow.steps.length}: ${step.name}`);

      // Update current step
      await supabase
        .from("workflow_runs")
        .update({ current_step: i + 1 })
        .eq("id", runId);

      // Check dependencies
      if (step.dependsOn && step.dependsOn.length > 0) {
        const missingDeps = step.dependsOn.filter((depId) => !context.stepResults.has(depId));
        if (missingDeps.length > 0) {
          throw new Error(`Step "${step.name}" has unmet dependencies: ${missingDeps.join(", ")}`);
        }
      }

      // Execute step
      try {
        const stepResult = await executeStep(step, context);
        context.stepResults.set(step.id, stepResult);
        results.push({ stepId: step.id, stepName: step.name, success: true, result: stepResult });

        // Log successful step
        await supabase.from("workflow_step_logs").insert({
          workflow_run_id: runId,
          step_index: i,
          step_name: step.name,
          step_type: step.type,
          status: "completed",
          input_data: step.config,
          output_data: stepResult,
          completed_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
        });
      } catch (stepError: any) {
        console.error(`[Workflow Executor] Step "${step.name}" failed:`, stepError);

        // Log failed step
        await supabase.from("workflow_step_logs").insert({
          workflow_run_id: runId,
          step_index: i,
          step_name: step.name,
          step_type: step.type,
          status: "failed",
          input_data: step.config,
          error_message: stepError.message,
          completed_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
        });

        if (step.continueOnError) {
          results.push({ stepId: step.id, stepName: step.name, success: false, error: stepError.message });
          context.stepResults.set(step.id, { error: stepError.message });
        } else {
          throw stepError;
        }
      }
    }

    // Mark workflow run as completed
    await supabase
      .from("workflow_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        step_results: results,
      })
      .eq("id", runId);

    return { success: true, runId, results };
  } catch (err: any) {
    error = err.message;
    console.error("[Workflow Executor] Workflow failed:", error);

    // Mark workflow run as failed
    await supabase
      .from("workflow_runs")
      .update({
        status: "failed",
        error_message: error,
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        step_results: results,
      })
      .eq("id", runId);

    return { success: false, runId, results, error };
  }
}

/**
 * Execute a single workflow step
 */
async function executeStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  switch (step.type) {
    case "query":
      return await executeQueryStep(step, context);
    case "filter":
      return await executeFilterStep(step, context);
    case "create":
      return await executeCreateStep(step, context);
    case "update":
      return await executeUpdateStep(step, context);
    case "notify":
      return await executeNotifyStep(step, context);
    case "ai_analyze":
      return await executeAIAnalyzeStep(step, context);
    case "conditional":
      return await executeConditionalStep(step, context);
    case "delay":
      return await executeDelayStep(step, context);
    default:
      throw new Error(`Unknown step type: ${(step as any).type}`);
  }
}

/**
 * Query step: Fetch data from database
 */
async function executeQueryStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  const supabase = createAdminClient();
  const { table, select = "*", filters = {} } = step.config;

  let query = supabase.from(table).select(select);

  // Apply filters
  for (const [field, value] of Object.entries(filters)) {
    query = query.eq(field, value);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Query failed: ${error.message}`);
  }

  return { count: data?.length || 0, data };
}

/**
 * Filter step: Filter results from previous step
 */
async function executeFilterStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  const { sourceStepId, conditions } = step.config;

  if (!sourceStepId) {
    throw new Error("Filter step requires sourceStepId");
  }

  const sourceResult = context.stepResults.get(sourceStepId);
  if (!sourceResult || !sourceResult.data) {
    throw new Error(`Source step "${sourceStepId}" has no data`);
  }

  const data = Array.isArray(sourceResult.data) ? sourceResult.data : [sourceResult.data];

  // Apply conditions
  const filtered = data.filter((item: any) => {
    return Object.entries(conditions).every(([field, expected]) => {
      const value = item[field];

      // Handle different condition types
      if (typeof expected === "object" && expected !== null) {
        const { operator, value: expectedValue } = expected as any;

        switch (operator) {
          case "gt": return value > expectedValue;
          case "gte": return value >= expectedValue;
          case "lt": return value < expectedValue;
          case "lte": return value <= expectedValue;
          case "contains": return String(value).includes(expectedValue);
          case "startsWith": return String(value).startsWith(expectedValue);
          default: return value === expectedValue;
        }
      }

      return value === expected;
    });
  });

  return { count: filtered.length, data: filtered };
}

/**
 * Create step: Create new records
 */
async function executeCreateStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  const supabase = createAdminClient();
  const { table, records } = step.config;

  if (!Array.isArray(records)) {
    throw new Error("Create step requires records array");
  }

  // Replace placeholders with values from previous steps
  const resolvedRecords = records.map((record: any) => {
    const resolved: any = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" && value.startsWith("{{") && value.endsWith("}}")) {
        // Extract step ID and field from placeholder: {{stepId.field}}
        const placeholder = value.slice(2, -2);
        const [stepId, ...fieldPath] = placeholder.split(".");
        const stepResult = context.stepResults.get(stepId);

        if (stepResult) {
          let resolvedValue = stepResult;
          for (const field of fieldPath) {
            resolvedValue = resolvedValue?.[field];
          }
          resolved[key] = resolvedValue;
        } else {
          resolved[key] = value; // Keep original if not found
        }
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  });

  const { data, error } = await supabase.from(table).insert(resolvedRecords).select();

  if (error) {
    throw new Error(`Create failed: ${error.message}`);
  }

  return { count: data?.length || 0, created: data };
}

/**
 * Update step: Update existing records
 */
async function executeUpdateStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  const supabase = createAdminClient();
  const { table, filters, updates } = step.config;

  let query = supabase.from(table).update(updates);

  // Apply filters
  for (const [field, value] of Object.entries(filters)) {
    query = query.eq(field, value);
  }

  const { data, error } = await query.select();

  if (error) {
    throw new Error(`Update failed: ${error.message}`);
  }

  return { count: data?.length || 0, updated: data };
}

/**
 * Notify step: Send notifications (placeholder - can be extended)
 */
async function executeNotifyStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  const { message, recipients = [] } = step.config;

  console.log(`[Workflow Notify] ${message} to ${recipients.join(", ")}`);

  // In a real implementation, this would send emails, push notifications, etc.
  return { notified: true, message, recipientCount: recipients.length };
}

/**
 * AI Analyze step: Use LangGraph agent to analyze data
 */
async function executeAIAnalyzeStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  const { sourceStepId, prompt } = step.config;

  if (!sourceStepId) {
    throw new Error("AI analyze step requires sourceStepId");
  }

  const sourceResult = context.stepResults.get(sourceStepId);
  if (!sourceResult) {
    throw new Error(`Source step "${sourceStepId}" has no result`);
  }

  // Build prompt with data
  const dataJson = JSON.stringify(sourceResult, null, 2);
  const fullPrompt = `${prompt}\n\nData:\n${dataJson}`;

  // Use LangGraph agent to analyze
  const result = await runLangGraphAgent(
    fullPrompt,
    [],
    `workflow_${context.workflowRunId}_${step.id}`
  );

  return {
    analysis: result.response,
    insights: result.insights || [],
    toolsUsed: result.toolResults?.length || 0,
  };
}

/**
 * Conditional step: Execute different branches based on conditions
 */
async function executeConditionalStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  const { sourceStepId, condition, field } = step.config;

  if (!sourceStepId) {
    throw new Error("Conditional step requires sourceStepId");
  }

  const sourceResult = context.stepResults.get(sourceStepId);
  if (!sourceResult) {
    throw new Error(`Source step "${sourceStepId}" has no result`);
  }

  // Evaluate condition
  const value = field ? sourceResult[field] : sourceResult;
  const { operator, expected } = condition;

  let conditionMet = false;

  switch (operator) {
    case "eq": conditionMet = value === expected; break;
    case "neq": conditionMet = value !== expected; break;
    case "gt": conditionMet = value > expected; break;
    case "gte": conditionMet = value >= expected; break;
    case "lt": conditionMet = value < expected; break;
    case "lte": conditionMet = value <= expected; break;
    case "contains": conditionMet = Array.isArray(value) ? value.includes(expected) : String(value).includes(expected); break;
    default: throw new Error(`Unknown operator: ${operator}`);
  }

  return { conditionMet, value, expected };
}

/**
 * Delay step: Wait for specified milliseconds
 */
async function executeDelayStep(step: WorkflowStep, context: WorkflowRunContext): Promise<any> {
  const { duration = 1000 } = step.config; // Default 1 second

  await new Promise((resolve) => setTimeout(resolve, duration));

  return { delayed: true, duration };
}
