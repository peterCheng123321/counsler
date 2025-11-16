-- Add missing foreign key constraint for essays.student_id -> students.id
-- This enables PostgREST joins and enforces referential integrity

DO $$
BEGIN
  -- Check if the foreign key constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'essays_student_id_fkey'
    AND table_name = 'essays'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE essays
    ADD CONSTRAINT essays_student_id_fkey
    FOREIGN KEY (student_id)
    REFERENCES students(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Added foreign key constraint essays_student_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint essays_student_id_fkey already exists';
  END IF;

  -- Optionally add foreign key for student_college_id if student_colleges table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'essays_student_college_id_fkey'
    AND table_name = 'essays'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'student_colleges'
  ) THEN
    ALTER TABLE essays
    ADD CONSTRAINT essays_student_college_id_fkey
    FOREIGN KEY (student_college_id)
    REFERENCES student_colleges(id)
    ON DELETE SET NULL;

    RAISE NOTICE 'Added foreign key constraint essays_student_college_id_fkey';
  END IF;
END $$;
