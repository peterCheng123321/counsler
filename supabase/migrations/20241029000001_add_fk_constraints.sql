-- Add foreign key constraints conditionally (only if users table has UUID id)
DO $$ 
BEGIN
  -- Check if users table has UUID id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
    AND table_schema = 'public'
  ) THEN
    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'students_counselor_id_fkey'
    ) THEN
      ALTER TABLE students ADD CONSTRAINT students_counselor_id_fkey 
        FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'notes_counselor_id_fkey'
    ) THEN
      ALTER TABLE notes ADD CONSTRAINT notes_counselor_id_fkey 
        FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'tasks_counselor_id_fkey'
    ) THEN
      ALTER TABLE tasks ADD CONSTRAINT tasks_counselor_id_fkey 
        FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'conversations_counselor_id_fkey'
    ) THEN
      ALTER TABLE conversations ADD CONSTRAINT conversations_counselor_id_fkey 
        FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'letters_of_recommendation_counselor_id_fkey'
    ) THEN
      ALTER TABLE letters_of_recommendation ADD CONSTRAINT letters_of_recommendation_counselor_id_fkey 
        FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ai_task_suggestions_counselor_id_fkey'
    ) THEN
      ALTER TABLE ai_task_suggestions ADD CONSTRAINT ai_task_suggestions_counselor_id_fkey 
        FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'notifications_user_id_fkey'
    ) THEN
      ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  ELSE
    RAISE NOTICE 'Users table does not have UUID id - foreign key constraints skipped. Please migrate users table to UUID first.';
  END IF;
END $$;





