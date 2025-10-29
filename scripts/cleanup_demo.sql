-- Cleanup Demo Data Script
-- Removes all demo-tagged data from the database
-- Run this when ready to remove demo data before public release

-- Delete demo insights
DELETE FROM insights WHERE demo = true;

-- Delete demo risk scores
DELETE FROM student_risk_scores WHERE demo = true;

-- Delete demo task recommendations
DELETE FROM task_recommendations WHERE demo = true;

-- Delete demo analysis runs
DELETE FROM analysis_runs WHERE demo = true;

-- Optionally delete demo students, tasks, etc. if they were tagged
-- Uncomment the following if you tagged demo data with a specific marker:

-- DELETE FROM tasks WHERE counselor_id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM notes WHERE counselor_id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM conversations WHERE counselor_id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM messages WHERE conversation_id IN (
--   SELECT id FROM conversations WHERE counselor_id = '00000000-0000-0000-0000-000000000001'
-- );
-- DELETE FROM student_colleges WHERE student_id IN (
--   SELECT id FROM students WHERE counselor_id = '00000000-0000-0000-0000-000000000001'
-- );
-- DELETE FROM activities WHERE student_id IN (
--   SELECT id FROM students WHERE counselor_id = '00000000-0000-0000-0000-000000000001'
-- );
-- DELETE FROM essays WHERE student_id IN (
--   SELECT id FROM students WHERE counselor_id = '00000000-0000-0000-0000-000000000001'
-- );
-- DELETE FROM students WHERE counselor_id = '00000000-0000-0000-0000-000000000001';

-- Note: Keep the demo user if you want to retain the user record, or delete it:
-- DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';

