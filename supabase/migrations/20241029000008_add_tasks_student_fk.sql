-- Add foreign key constraint for tasks.student_id -> students.id
-- This is needed for PostgREST to recognize the relationship for nested queries

DO $$ 
BEGIN
  -- Check if tasks table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tasks' 
    AND table_schema = 'public'
  ) THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'tasks_student_id_fkey'
      AND table_name = 'tasks'
    ) THEN
      ALTER TABLE tasks ADD CONSTRAINT tasks_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint tasks_student_id_fkey';
    ELSE
      RAISE NOTICE 'Foreign key constraint tasks_student_id_fkey already exists';
    END IF;
  END IF;
END $$;

