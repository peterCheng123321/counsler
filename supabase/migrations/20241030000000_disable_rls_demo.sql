-- Disable RLS for demo mode
-- This migration removes Row Level Security restrictions for demo purposes

-- Disable RLS on all tables
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies (they won't be used when RLS is disabled)
DROP POLICY IF EXISTS "Users can view own students" ON students;
DROP POLICY IF EXISTS "Users can insert own students" ON students;
DROP POLICY IF EXISTS "Users can update own students" ON students;
DROP POLICY IF EXISTS "Users can delete own students" ON students;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Grant full permissions to authenticated users (and anon for demo)
GRANT ALL ON students TO authenticated;
GRANT ALL ON students TO anon;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON tasks TO anon;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversations TO anon;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO anon;

-- Insert demo data if tables are empty
INSERT INTO students (id, user_id, name, email, high_school, graduation_year, gpa, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'demo-user-id'::text,
  'Demo Student',
  'demo@example.com',
  'Demo High School',
  2025,
  3.8,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM students LIMIT 1);

INSERT INTO tasks (id, user_id, student_id, title, description, status, due_date, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'demo-user-id'::text,
  s.id,
  'Complete Common Application',
  'Fill out the Common Application form with personal information',
  'in_progress',
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
FROM students s 
WHERE s.name = 'Demo Student' AND NOT EXISTS (SELECT 1 FROM tasks LIMIT 1);

INSERT INTO tasks (id, user_id, student_id, title, description, status, due_date, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'demo-user-id'::text,
  s.id,
  'Request Teacher Recommendations',
  'Ask two teachers for letters of recommendation',
  'pending',
  NOW() + INTERVAL '45 days',
  NOW(),
  NOW()
FROM students s 
WHERE s.name = 'Demo Student';

COMMENT ON COLUMN students.user_id IS 'User ID - demo mode: authentication bypassed';
COMMENT ON COLUMN tasks.user_id IS 'User ID - demo mode: authentication bypassed';
COMMENT ON COLUMN conversations.user_id IS 'User ID - demo mode: authentication bypassed';
COMMENT ON COLUMN messages.user_id IS 'User ID - demo mode: authentication bypassed';
