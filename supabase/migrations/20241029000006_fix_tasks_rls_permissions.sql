-- Fix RLS policies for tasks table
-- Similar to the messages table fix, split the single "FOR ALL" policy into separate policies

-- Drop existing policy
DROP POLICY IF EXISTS "Counselors can manage own tasks" ON tasks;

-- Create new policies that work better
CREATE POLICY "Counselors can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = counselor_id);

CREATE POLICY "Counselors can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = counselor_id);

CREATE POLICY "Counselors can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = counselor_id);

CREATE POLICY "Counselors can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = counselor_id);
