/**
 * Persistent Checkpoint Store for LangGraph using Supabase PostgreSQL
 * Implements CheckpointSaver interface for persistent conversation memory
 */

import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase-based checkpoint saver for persistent conversation memory
 * Stores agent state in PostgreSQL for cross-session persistence
 */
export class SupabaseCheckpointSaver extends BaseCheckpointSaver {
  private supabase = createAdminClient();

  constructor() {
    super();
    this.ensureCheckpointTable();
  }

  /**
   * Ensure checkpoint table exists in Supabase
   */
  private async ensureCheckpointTable() {
    // Table should be created via migration, but we'll verify
    const { error } = await this.supabase
      .from("agent_checkpoints")
      .select("id")
      .limit(1);

    if (error && error.message.includes("does not exist")) {
      console.warn(
        "[SupabaseCheckpointSaver] agent_checkpoints table doesn't exist. Run migration: supabase/migrations/20251030_agent_checkpoints.sql"
      );
    }
  }

  /**
   * Get checkpoint by thread_id and checkpoint_id
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) {
      return undefined;
    }

    try {
      let query = this.supabase
        .from("agent_checkpoints")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false });

      if (checkpointId) {
        query = query.eq("checkpoint_id", checkpointId);
      }

      const { data, error } = await query.limit(1).single();

      if (error || !data) {
        return undefined;
      }

      // Deserialize checkpoint data
      const checkpoint: Checkpoint = JSON.parse(data.checkpoint_data);
      const metadata: CheckpointMetadata = data.metadata || {};

      return {
        config: {
          configurable: {
            thread_id: data.thread_id,
            checkpoint_id: data.checkpoint_id,
          },
        },
        checkpoint,
        metadata,
        parentConfig: data.parent_checkpoint_id
          ? {
              configurable: {
                thread_id: data.thread_id,
                checkpoint_id: data.parent_checkpoint_id,
              },
            }
          : undefined,
      };
    } catch (error) {
      console.error("[SupabaseCheckpointSaver] Error getting checkpoint:", error);
      return undefined;
    }
  }

  /**
   * List all checkpoints for a thread
   */
  async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig }
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;

    if (!threadId) {
      return;
    }

    try {
      let query = this.supabase
        .from("agent_checkpoints")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.before) {
        const beforeCheckpointId = options.before.configurable?.checkpoint_id;
        if (beforeCheckpointId) {
          const { data: beforeData } = await this.supabase
            .from("agent_checkpoints")
            .select("created_at")
            .eq("checkpoint_id", beforeCheckpointId)
            .single();

          if (beforeData) {
            query = query.lt("created_at", beforeData.created_at);
          }
        }
      }

      const { data, error } = await query;

      if (error || !data) {
        return;
      }

      for (const row of data) {
        const checkpoint: Checkpoint = JSON.parse(row.checkpoint_data);
        const metadata: CheckpointMetadata = row.metadata || {};

        yield {
          config: {
            configurable: {
              thread_id: row.thread_id,
              checkpoint_id: row.checkpoint_id,
            },
          },
          checkpoint,
          metadata,
          parentConfig: row.parent_checkpoint_id
            ? {
                configurable: {
                  thread_id: row.thread_id,
                  checkpoint_id: row.parent_checkpoint_id,
                },
              }
            : undefined,
        };
      }
    } catch (error) {
      console.error("[SupabaseCheckpointSaver] Error listing checkpoints:", error);
    }
  }

  /**
   * Put writes (required by BaseCheckpointSaver)
   */
  async putWrites(
    config: RunnableConfig,
    writes: any[],
    taskId: string
  ): Promise<void> {
    // Not implemented for basic checkpoint saver
    // This would be used for more advanced features
    console.log("[SupabaseCheckpointSaver] putWrites called (not implemented)");
  }

  /**
   * Delete thread (required by BaseCheckpointSaver)
   */
  async deleteThread(threadId: string): Promise<void> {
    try {
      await this.supabase
        .from("agent_checkpoints")
        .delete()
        .eq("thread_id", threadId);

      console.log(`[SupabaseCheckpointSaver] Deleted thread ${threadId}`);
    } catch (error) {
      console.error("[SupabaseCheckpointSaver] Error deleting thread:", error);
      throw error;
    }
  }

  /**
   * Save a checkpoint to Supabase
   * Uses UPSERT to handle retries gracefully
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;

    if (!threadId) {
      throw new Error("thread_id is required in config.configurable");
    }

    try {
      const checkpointId =
        config.configurable?.checkpoint_id || `checkpoint_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const parentCheckpointId = config.configurable?.parent_checkpoint_id;

      // Use upsert to handle retries gracefully
      // This will insert if not exists, or update if already exists (retry scenario)
      const { error } = await this.supabase.from("agent_checkpoints").upsert({
        thread_id: threadId,
        checkpoint_id: checkpointId,
        parent_checkpoint_id: parentCheckpointId || null,
        checkpoint_data: JSON.stringify(checkpoint),
        metadata: metadata || {},
        updated_at: new Date().toISOString(), // Update timestamp on retry
      }, {
        onConflict: 'thread_id,checkpoint_id', // Specify conflict columns
      });

      if (error) {
        console.error("[SupabaseCheckpointSaver] Error saving checkpoint:", error);
        throw error;
      }

      console.log(`[SupabaseCheckpointSaver] Saved checkpoint ${checkpointId} for thread ${threadId}`);

      return {
        configurable: {
          thread_id: threadId,
          checkpoint_id: checkpointId,
        },
      };
    } catch (error) {
      console.error("[SupabaseCheckpointSaver] Error in put:", error);
      throw error;
    }
  }
}

/**
 * Create or get persistent checkpoint saver instance
 */
let checkpointSaverInstance: SupabaseCheckpointSaver | null = null;

export function getPersistentCheckpointSaver(): SupabaseCheckpointSaver {
  if (!checkpointSaverInstance) {
    checkpointSaverInstance = new SupabaseCheckpointSaver();
  }
  return checkpointSaverInstance;
}
