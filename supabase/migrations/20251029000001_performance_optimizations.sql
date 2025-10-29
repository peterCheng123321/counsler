-- Performance Optimization Migration
-- Adds missing indexes and improves query performance

-- Index for message history queries (conversation_id + created_at DESC)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_desc
ON messages(conversation_id, created_at DESC);

-- Index for student_colleges joins with application_type filter
CREATE INDEX IF NOT EXISTS idx_student_colleges_app_type_student
ON student_colleges(application_type, student_id);

-- Index for tasks with counselor, due date, and status (for deadline queries)
CREATE INDEX IF NOT EXISTS idx_tasks_counselor_due_status
ON tasks(counselor_id, due_date, status)
WHERE status IN ('pending', 'in_progress');

-- Index for activities by student (for activity scoring)
CREATE INDEX IF NOT EXISTS idx_activities_student
ON activities(student_id);

-- Index for essays by student (for essay analysis)
CREATE INDEX IF NOT EXISTS idx_essays_student
ON essays(student_id);

-- Composite index for student_colleges with deadline filtering
CREATE INDEX IF NOT EXISTS idx_student_colleges_deadline
ON student_colleges(student_id, deadline);

-- Index for AI insights by entity
CREATE INDEX IF NOT EXISTS idx_ai_insights_entity
ON ai_insights(entity_type, entity_id);

-- Add comments for documentation
COMMENT ON INDEX idx_messages_conversation_created_desc IS
  'Optimizes chatbot message history queries - fetches last N messages efficiently';

COMMENT ON INDEX idx_student_colleges_app_type_student IS
  'Optimizes get_students_by_application_type AI tool queries';

COMMENT ON INDEX idx_tasks_counselor_due_status IS
  'Optimizes deadline and workload forecast queries';

-- Analyze tables to update statistics for query planner
ANALYZE messages;
ANALYZE student_colleges;
ANALYZE tasks;
ANALYZE activities;
ANALYZE essays;
ANALYZE ai_insights;
