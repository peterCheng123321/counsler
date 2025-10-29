-- Add tool_calls and tool_call_id columns to messages table for function calling support
-- Also update role to support 'tool' role

ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS tool_calls JSONB,
  ADD COLUMN IF NOT EXISTS tool_call_id VARCHAR(255);

-- Update role constraint to include 'tool' role
ALTER TABLE messages 
  DROP CONSTRAINT IF EXISTS messages_role_check;

ALTER TABLE messages 
  ADD CONSTRAINT messages_role_check CHECK (role IN ('user', 'assistant', 'tool', 'system'));

-- Add index for tool_call_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_tool_call_id ON messages(tool_call_id) WHERE tool_call_id IS NOT NULL;

