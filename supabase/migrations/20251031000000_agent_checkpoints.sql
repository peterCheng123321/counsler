-- Create agent_checkpoints table for persistent LangGraph memory
-- This stores conversation state and allows the agent to remember context across sessions

CREATE TABLE IF NOT EXISTS agent_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  checkpoint_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique checkpoint per thread
  UNIQUE(thread_id, checkpoint_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_thread ON agent_checkpoints(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_checkpoint_id ON agent_checkpoints(checkpoint_id);

-- Disable RLS for demo mode (admin client access only)
ALTER TABLE agent_checkpoints DISABLE ROW LEVEL SECURITY;

-- Add cleanup function to remove old checkpoints (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_checkpoints()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_checkpoints
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE agent_checkpoints IS 'Persistent storage for LangGraph agent conversation state and memory';
COMMENT ON COLUMN agent_checkpoints.thread_id IS 'Conversation thread identifier (usually conversation_id)';
COMMENT ON COLUMN agent_checkpoints.checkpoint_id IS 'Unique checkpoint identifier within thread';
COMMENT ON COLUMN agent_checkpoints.checkpoint_data IS 'Serialized checkpoint state (messages, intermediate steps)';
COMMENT ON COLUMN agent_checkpoints.metadata IS 'Additional checkpoint metadata (tokens, model, etc)';
