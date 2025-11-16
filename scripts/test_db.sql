-- Test queries to verify database schema and connectivity
-- Test 1: List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 2: Check students table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position
LIMIT 20;

-- Test 3: Check if we can query students (count)
SELECT COUNT(*) as student_count FROM students;

-- Test 4: Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname
LIMIT 20;

-- Test 5: Check indexes on students table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'students'
LIMIT 10;





