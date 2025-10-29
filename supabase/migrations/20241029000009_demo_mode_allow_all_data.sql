-- Temporary demo mode: Allow all authenticated users to access all mock data
-- This is for demonstration purposes only

-- Update students RLS policy to allow all authenticated users
DROP POLICY IF EXISTS "Counselors can view own students" ON students;
DROP POLICY IF EXISTS "Counselors can view students" ON students;
CREATE POLICY "Demo: All authenticated users can view all students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

-- Update tasks RLS policy to allow all authenticated users  
DROP POLICY IF EXISTS "Counselors can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Counselors can manage own tasks" ON tasks;
CREATE POLICY "Demo: All authenticated users can view all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

-- Keep insert/update/delete restricted to counselor_id for data integrity
-- These policies remain unchanged for demo purposes

-- Grant SELECT permissions to authenticated role
GRANT SELECT ON students TO authenticated;
GRANT SELECT ON tasks TO authenticated;

