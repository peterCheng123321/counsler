-- Simple RLS disable for demo mode
-- This migration disables Row Level Security without touching existing policies

-- Disable RLS on main tables
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;

-- Grant full permissions for demo mode
GRANT ALL ON students TO authenticated;
GRANT ALL ON students TO anon;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON tasks TO anon;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversations TO anon;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO anon;

-- Insert demo data if students table is empty
INSERT INTO students (id, user_id, name, email, high_school, graduation_year, gpa, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'demo-user-id',
  'Demo Student',
  'demo@example.com',
  'Demo High School',
  2025,
  3.8,
  NOW(),
  NOW()
WHERE 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public')
  AND NOT EXISTS (SELECT 1 FROM students LIMIT 1);