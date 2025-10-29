-- Fix RLS policies for messages table
-- The policy needs WITH CHECK clause for INSERT operations

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Counselors can manage messages" ON messages;

-- Create separate policies for SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Counselors can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can update messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can delete messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

