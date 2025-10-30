-- Fix RLS policies for messages table
-- The issue is that the policy checks conversations.counselor_id but that requires a JOIN
-- which can cause permission issues in RLS policies

-- Drop existing policy
DROP POLICY IF EXISTS "Counselors can manage messages" ON messages;

-- Create new policy that works better
CREATE POLICY "Counselors can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can update own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can delete own messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );
