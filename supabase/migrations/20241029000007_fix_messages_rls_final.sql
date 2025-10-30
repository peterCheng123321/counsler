-- Fix RLS policies for messages table - comprehensive fix
-- Drop all existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Counselors can manage messages" ON messages;
DROP POLICY IF EXISTS "Counselors can view messages" ON messages;
DROP POLICY IF EXISTS "Counselors can insert messages" ON messages;
DROP POLICY IF EXISTS "Counselors can update messages" ON messages;
DROP POLICY IF EXISTS "Counselors can delete messages" ON messages;
DROP POLICY IF EXISTS "Counselors can view own messages" ON messages;
DROP POLICY IF EXISTS "Counselors can insert own messages" ON messages;
DROP POLICY IF EXISTS "Counselors can update own messages" ON messages;
DROP POLICY IF EXISTS "Counselors can delete own messages" ON messages;

-- Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create separate policies for each operation
-- SELECT policy
CREATE POLICY "Counselors can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

-- INSERT policy (needs WITH CHECK)
CREATE POLICY "Counselors can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

-- UPDATE policy
CREATE POLICY "Counselors can update messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

-- DELETE policy
CREATE POLICY "Counselors can delete messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- Also ensure conversations table has proper policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Counselors can manage own conversations" ON conversations;
CREATE POLICY "Counselors can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = counselor_id)
  WITH CHECK (auth.uid() = counselor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;

