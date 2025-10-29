/**
 * Insights CRUD helper functions
 * Provides methods to create, read, update, and delete AI-generated insights
 */

import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, DEMO_WORKSPACE_ID } from "@/lib/env";

export type InsightEntityType = "student" | "task" | "cohort" | "workspace";
export type InsightKind =
  | "risk_score"
  | "workload_forecast"
  | "anomaly"
  | "summary"
  | "recommendation"
  | "trend"
  | "lor_draft";

export interface Insight {
  id: string;
  user_id: string;
  entity_type: InsightEntityType;
  entity_id: string | null;
  kind: InsightKind;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  demo?: boolean;
  demo_workspace_id?: string | null;
}

export interface CreateInsightInput {
  entity_type: InsightEntityType;
  entity_id?: string | null;
  kind: InsightKind;
  content: string;
  metadata?: Record<string, any>;
  demo?: boolean;
}

/**
 * Create a new insight
 */
export async function createInsight(input: CreateInsightInput): Promise<Insight> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("insights")
    .insert({
      user_id: user.id,
      entity_type: input.entity_type,
      entity_id: input.entity_id || null,
      kind: input.kind,
      content: input.content,
      metadata: input.metadata || {},
      demo: input.demo || false,
      demo_workspace_id: input.demo ? DEMO_WORKSPACE_ID : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create insight: ${error.message}`);
  }

  return data;
}

/**
 * Get insights for a specific entity
 */
export async function getInsightsByEntity(
  entityType: InsightEntityType,
  entityId?: string | null,
  kind?: InsightKind
): Promise<Insight[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  let query = supabase
    .from("insights")
    .select("*")
    .eq("entity_type", entityType)
    .order("created_at", { ascending: false });

  if (entityId) {
    query = query.eq("entity_id", entityId);
  } else {
    query = query.is("entity_id", null);
  }

  if (kind) {
    query = query.eq("kind", kind);
  }

  // Include demo insights if in demo mode
  if (DEMO_MODE) {
    query = query.or(`user_id.eq.${user.id},demo.eq.true`);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch insights: ${error.message}`);
  }

  return data || [];
}

/**
 * Get insights for the current user (workspace-level or all)
 */
export async function getUserInsights(
  kind?: InsightKind,
  limit?: number
): Promise<Insight[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  let query = supabase
    .from("insights")
    .select("*")
    .order("created_at", { ascending: false });

  // Include demo insights if in demo mode
  if (DEMO_MODE) {
    query = query.or(`user_id.eq.${user.id},demo.eq.true`);
  } else {
    query = query.eq("user_id", user.id);
  }

  if (kind) {
    query = query.eq("kind", kind);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch insights: ${error.message}`);
  }

  return data || [];
}

/**
 * Update an insight
 */
export async function updateInsight(
  insightId: string,
  updates: Partial<Pick<Insight, "content" | "metadata">>
): Promise<Insight> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("insights")
    .update(updates)
    .eq("id", insightId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update insight: ${error.message}`);
  }

  if (!data) {
    throw new Error("Insight not found");
  }

  return data;
}

/**
 * Delete an insight
 */
export async function deleteInsight(insightId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("insights")
    .delete()
    .eq("id", insightId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete insight: ${error.message}`);
  }
}

/**
 * Get latest insight of a specific kind for an entity
 */
export async function getLatestInsight(
  entityType: InsightEntityType,
  entityId: string | null,
  kind: InsightKind
): Promise<Insight | null> {
  const insights = await getInsightsByEntity(entityType, entityId, kind);
  return insights.length > 0 ? insights[0] : null;
}

