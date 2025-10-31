-- Add updated_at column to agent_checkpoints for tracking checkpoint updates (retries)
-- This allows us to distinguish between new checkpoints and updates to existing ones

ALTER TABLE agent_checkpoints
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_updated_at ON agent_checkpoints(updated_at DESC);

-- Update cleanup function to use updated_at for more accurate cleanup
CREATE OR REPLACE FUNCTION cleanup_old_checkpoints()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_checkpoints
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON COLUMN agent_checkpoints.updated_at IS 'Last update timestamp (for tracking retries and updates)';
