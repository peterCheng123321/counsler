-- Safe Migration: Only adds missing tables/columns/indexes
-- Preserves all existing data

-- Enable UUID extension (if not exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to safely add columns
CREATE OR REPLACE FUNCTION safe_add_column(
  table_name TEXT,
  column_name TEXT,
  column_type TEXT,
  column_default TEXT DEFAULT NULL,
  not_null BOOLEAN DEFAULT false
) RETURNS void AS $$
DECLARE
  default_clause TEXT := '';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND information_schema.columns.table_name = safe_add_column.table_name
    AND information_schema.columns.column_name = safe_add_column.column_name
  ) THEN
    IF column_default IS NOT NULL THEN
      default_clause := ' DEFAULT ' || column_default;
    END IF;
    
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN %I %s%s%s',
      safe_add_column.table_name,
      safe_add_column.column_name,
      safe_add_column.column_type,
      default_clause,
      CASE WHEN safe_add_column.not_null THEN ' NOT NULL' ELSE '' END
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to safely create indexes
CREATE OR REPLACE FUNCTION safe_create_index(
  index_name TEXT,
  table_name TEXT,
  column_names TEXT,
  unique_index BOOLEAN DEFAULT false,
  where_clause TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = safe_create_index.index_name
  ) THEN
    IF unique_index THEN
      EXECUTE format(
        'CREATE UNIQUE INDEX %I ON %I(%s)%s',
        safe_create_index.index_name,
        safe_create_index.table_name,
        safe_create_index.column_names,
        COALESCE(' WHERE ' || safe_create_index.where_clause, '')
      );
    ELSE
      EXECUTE format(
        'CREATE INDEX %I ON %I(%s)%s',
        safe_create_index.index_name,
        safe_create_index.table_name,
        safe_create_index.column_names,
        COALESCE(' WHERE ' || safe_create_index.where_clause, '')
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50),
  organization_id UUID,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
);

-- Add missing columns to users table
DO $$ 
BEGIN
  -- Only add columns if table exists but column doesn't
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    PERFORM safe_add_column('users', 'id', 'UUID', NULL, false);
    PERFORM safe_add_column('users', 'email', 'VARCHAR(255)', NULL, false);
    PERFORM safe_add_column('users', 'first_name', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('users', 'last_name', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('users', 'role', 'VARCHAR(50)', '''counselor''', false);
    PERFORM safe_add_column('users', 'organization_id', 'UUID', NULL, false);
    PERFORM safe_add_column('users', 'profile_picture_url', 'TEXT', NULL, false);
    PERFORM safe_add_column('users', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('users', 'updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('users', 'last_login', 'TIMESTAMP WITH TIME ZONE', NULL, false);
    PERFORM safe_add_column('users', 'is_active', 'BOOLEAN', 'true', false);
    
    -- Remove password_hash if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
      ALTER TABLE users DROP COLUMN password_hash;
    END IF;
  END IF;
END $$;

-- Create indexes for users
SELECT safe_create_index('idx_users_email', 'users', 'email', false);
SELECT safe_create_index('idx_users_organization', 'users', 'organization_id', false, 'organization_id IS NOT NULL');

-- Function to sync user from auth.users (only if users table has UUID id)
DO $$ 
BEGIN
  -- Check if users table has UUID id before creating trigger
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
  ) THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $func$
    BEGIN
      INSERT INTO public.users (id, email, first_name, last_name)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>''first_name'', ''User''),
        COALESCE(NEW.raw_user_meta_data->>>''last_name'', ''User'')
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        email = EXCLUDED.email,
        last_login = NOW(),
        updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER';

    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID,
  school_id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  date_of_birth DATE,
  graduation_year INTEGER,
  gpa_unweighted DECIMAL(3,2),
  gpa_weighted DECIMAL(3,2),
  class_rank INTEGER,
  class_size INTEGER,
  sat_score INTEGER,
  sat_ebrw INTEGER,
  sat_math INTEGER,
  act_score INTEGER,
  application_progress INTEGER DEFAULT 0,
  profile_picture_url TEXT,
  resume_url TEXT,
  transcript_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to students
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    PERFORM safe_add_column('students', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('students', 'counselor_id', 'UUID', NULL, false);
    PERFORM safe_add_column('students', 'school_id', 'UUID', NULL, false);
    PERFORM safe_add_column('students', 'first_name', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('students', 'last_name', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('students', 'email', 'VARCHAR(255)', NULL, false);
    PERFORM safe_add_column('students', 'phone', 'VARCHAR(20)', NULL, false);
    PERFORM safe_add_column('students', 'date_of_birth', 'DATE', NULL, false);
    PERFORM safe_add_column('students', 'graduation_year', 'INTEGER', NULL, false);
    PERFORM safe_add_column('students', 'gpa_unweighted', 'DECIMAL(3,2)', NULL, false);
    PERFORM safe_add_column('students', 'gpa_weighted', 'DECIMAL(3,2)', NULL, false);
    PERFORM safe_add_column('students', 'class_rank', 'INTEGER', NULL, false);
    PERFORM safe_add_column('students', 'class_size', 'INTEGER', NULL, false);
    PERFORM safe_add_column('students', 'sat_score', 'INTEGER', NULL, false);
    PERFORM safe_add_column('students', 'sat_ebrw', 'INTEGER', NULL, false);
    PERFORM safe_add_column('students', 'sat_math', 'INTEGER', NULL, false);
    PERFORM safe_add_column('students', 'act_score', 'INTEGER', NULL, false);
    PERFORM safe_add_column('students', 'application_progress', 'INTEGER', '0', false);
    PERFORM safe_add_column('students', 'profile_picture_url', 'TEXT', NULL, false);
    PERFORM safe_add_column('students', 'resume_url', 'TEXT', NULL, false);
    PERFORM safe_add_column('students', 'transcript_url', 'TEXT', NULL, false);
    PERFORM safe_add_column('students', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('students', 'updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

-- Add constraints for students
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    -- Add unique constraint on email
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'students_email_key' 
      AND table_name = 'students'
    ) THEN
      ALTER TABLE students ADD CONSTRAINT students_email_key UNIQUE (email);
    END IF;
    
    -- Add check constraint for application_progress
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints 
      WHERE constraint_name = 'students_application_progress_check'
    ) THEN
      ALTER TABLE students ADD CONSTRAINT students_application_progress_check 
        CHECK (application_progress >= 0 AND application_progress <= 100);
    END IF;
  END IF;
END $$;

-- Create indexes for students (only if columns exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'counselor_id') THEN
      PERFORM safe_create_index('idx_students_counselor', 'students', 'counselor_id', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'school_id') THEN
      PERFORM safe_create_index('idx_students_school', 'students', 'school_id', false, 'school_id IS NOT NULL');
      PERFORM safe_create_index('idx_students_counselor_school', 'students', 'counselor_id, school_id', false, 'school_id IS NOT NULL');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'graduation_year') THEN
      PERFORM safe_create_index('idx_students_grad_year', 'students', 'graduation_year', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'last_name') THEN
      PERFORM safe_create_index('idx_students_name', 'students', 'last_name, first_name', false);
    END IF;
    -- Full-text search index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'first_name') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_fts') THEN
        EXECUTE 'CREATE INDEX idx_students_fts ON students USING gin(to_tsvector(''english'', coalesce(first_name, '''') || '' '' || coalesce(last_name, '''') || '' '' || coalesce(email, '''')))';
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================
-- COLLEGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  location_city VARCHAR(100),
  location_state VARCHAR(50),
  location_country VARCHAR(100) DEFAULT 'USA',
  type VARCHAR(50),
  acceptance_rate DECIMAL(5,2),
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'colleges') THEN
    PERFORM safe_add_column('colleges', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('colleges', 'name', 'VARCHAR(255)', NULL, false);
    PERFORM safe_add_column('colleges', 'location_city', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('colleges', 'location_state', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('colleges', 'location_country', 'VARCHAR(100)', '''USA''', false);
    PERFORM safe_add_column('colleges', 'type', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('colleges', 'acceptance_rate', 'DECIMAL(5,2)', NULL, false);
    PERFORM safe_add_column('colleges', 'logo_url', 'TEXT', NULL, false);
    PERFORM safe_add_column('colleges', 'website_url', 'TEXT', NULL, false);
    PERFORM safe_add_column('colleges', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

SELECT safe_create_index('idx_colleges_name', 'colleges', 'name', false);
SELECT safe_create_index('idx_colleges_name_location', 'colleges', 'name, location_city, location_state', true, 'location_city IS NOT NULL AND location_state IS NOT NULL');

-- ============================================
-- STUDENT_COLLEGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  college_id UUID,
  application_type VARCHAR(50),
  deadline DATE,
  college_type VARCHAR(50),
  application_portal VARCHAR(50),
  application_status VARCHAR(50) DEFAULT 'not_started',
  application_progress INTEGER DEFAULT 0,
  essays_required INTEGER DEFAULT 0,
  essays_completed INTEGER DEFAULT 0,
  lors_required INTEGER DEFAULT 0,
  lors_completed INTEGER DEFAULT 0,
  transcript_requested BOOLEAN DEFAULT false,
  transcript_received BOOLEAN DEFAULT false,
  test_scores_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_colleges') THEN
    PERFORM safe_add_column('student_colleges', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('student_colleges', 'student_id', 'UUID', NULL, false);
    PERFORM safe_add_column('student_colleges', 'college_id', 'UUID', NULL, false);
    PERFORM safe_add_column('student_colleges', 'application_type', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('student_colleges', 'deadline', 'DATE', NULL, false);
    PERFORM safe_add_column('student_colleges', 'college_type', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('student_colleges', 'application_portal', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('student_colleges', 'application_status', 'VARCHAR(50)', '''not_started''', false);
    PERFORM safe_add_column('student_colleges', 'application_progress', 'INTEGER', '0', false);
    PERFORM safe_add_column('student_colleges', 'essays_required', 'INTEGER', '0', false);
    PERFORM safe_add_column('student_colleges', 'essays_completed', 'INTEGER', '0', false);
    PERFORM safe_add_column('student_colleges', 'lors_required', 'INTEGER', '0', false);
    PERFORM safe_add_column('student_colleges', 'lors_completed', 'INTEGER', '0', false);
    PERFORM safe_add_column('student_colleges', 'transcript_requested', 'BOOLEAN', 'false', false);
    PERFORM safe_add_column('student_colleges', 'transcript_received', 'BOOLEAN', 'false', false);
    PERFORM safe_add_column('student_colleges', 'test_scores_sent', 'BOOLEAN', 'false', false);
    PERFORM safe_add_column('student_colleges', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('student_colleges', 'updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

-- Add constraints
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_colleges') THEN
    -- Unique constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'student_colleges_student_id_college_id_key'
    ) THEN
      ALTER TABLE student_colleges ADD CONSTRAINT student_colleges_student_id_college_id_key 
        UNIQUE (student_id, college_id);
    END IF;
    
    -- Check constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints 
      WHERE constraint_name = 'student_colleges_application_type_check'
    ) THEN
      ALTER TABLE student_colleges ADD CONSTRAINT student_colleges_application_type_check 
        CHECK (application_type IN ('EA', 'ED', 'RD', 'Rolling'));
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints 
      WHERE constraint_name = 'student_colleges_college_type_check'
    ) THEN
      ALTER TABLE student_colleges ADD CONSTRAINT student_colleges_college_type_check 
        CHECK (college_type IN ('Safety', 'Target', 'Reach'));
    END IF;
  END IF;
END $$;

-- Indexes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_colleges') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_colleges' AND column_name = 'student_id') THEN
      PERFORM safe_create_index('idx_student_colleges_student', 'student_colleges', 'student_id', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_colleges' AND column_name = 'deadline') THEN
      PERFORM safe_create_index('idx_student_colleges_deadline', 'student_colleges', 'deadline', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_colleges' AND column_name = 'application_status') THEN
      PERFORM safe_create_index('idx_student_colleges_status', 'student_colleges', 'application_status', false);
    END IF;
  END IF;
END $$;

-- ============================================
-- ESSAYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  student_college_id UUID,
  title VARCHAR(255),
  prompt TEXT,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  word_limit INTEGER,
  status VARCHAR(50) DEFAULT 'not_started',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essays') THEN
    PERFORM safe_add_column('essays', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('essays', 'student_id', 'UUID', NULL, false);
    PERFORM safe_add_column('essays', 'student_college_id', 'UUID', NULL, false);
    PERFORM safe_add_column('essays', 'title', 'VARCHAR(255)', NULL, false);
    PERFORM safe_add_column('essays', 'prompt', 'TEXT', NULL, false);
    PERFORM safe_add_column('essays', 'content', 'TEXT', NULL, false);
    PERFORM safe_add_column('essays', 'word_count', 'INTEGER', '0', false);
    PERFORM safe_add_column('essays', 'word_limit', 'INTEGER', NULL, false);
    PERFORM safe_add_column('essays', 'status', 'VARCHAR(50)', '''not_started''', false);
    PERFORM safe_add_column('essays', 'version', 'INTEGER', '1', false);
    PERFORM safe_add_column('essays', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('essays', 'updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

-- Indexes for essays (only if columns exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essays') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'student_id') THEN
      PERFORM safe_create_index('idx_essays_student', 'essays', 'student_id', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'status') THEN
      PERFORM safe_create_index('idx_essays_status', 'essays', 'status', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'student_college_id') THEN
      PERFORM safe_create_index('idx_essays_student_college', 'essays', 'student_college_id', false, 'student_college_id IS NOT NULL');
    END IF;
  END IF;
END $$;

-- ============================================
-- ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  activity_name VARCHAR(255),
  position VARCHAR(100),
  description TEXT,
  participation_grades TEXT[],
  timing VARCHAR(50),
  hours_per_week INTEGER,
  weeks_per_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    PERFORM safe_add_column('activities', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('activities', 'student_id', 'UUID', NULL, false);
    PERFORM safe_add_column('activities', 'activity_name', 'VARCHAR(255)', NULL, false);
    PERFORM safe_add_column('activities', 'position', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('activities', 'description', 'TEXT', NULL, false);
    PERFORM safe_add_column('activities', 'participation_grades', 'TEXT[]', NULL, false);
    PERFORM safe_add_column('activities', 'timing', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('activities', 'hours_per_week', 'INTEGER', NULL, false);
    PERFORM safe_add_column('activities', 'weeks_per_year', 'INTEGER', NULL, false);
    PERFORM safe_add_column('activities', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'student_id') THEN
      PERFORM safe_create_index('idx_activities_student', 'activities', 'student_id', false);
    END IF;
  END IF;
END $$;

-- ============================================
-- NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  counselor_id UUID,
  note_type VARCHAR(50),
  content TEXT,
  reminder_date TIMESTAMP WITH TIME ZONE,
  is_priority BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
    PERFORM safe_add_column('notes', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('notes', 'student_id', 'UUID', NULL, false);
    PERFORM safe_add_column('notes', 'counselor_id', 'UUID', NULL, false);
    PERFORM safe_add_column('notes', 'note_type', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('notes', 'content', 'TEXT', NULL, false);
    PERFORM safe_add_column('notes', 'reminder_date', 'TIMESTAMP WITH TIME ZONE', NULL, false);
    PERFORM safe_add_column('notes', 'is_priority', 'BOOLEAN', 'false', false);
    PERFORM safe_add_column('notes', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('notes', 'updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'student_id') THEN
      PERFORM safe_create_index('idx_notes_student', 'notes', 'student_id', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'reminder_date') THEN
      PERFORM safe_create_index('idx_notes_reminder', 'notes', 'reminder_date', false, 'reminder_date IS NOT NULL');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'counselor_id') THEN
      PERFORM safe_create_index('idx_notes_counselor', 'notes', 'counselor_id', false);
    END IF;
  END IF;
END $$;

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID,
  student_id UUID,
  title VARCHAR(255),
  description TEXT,
  due_date DATE,
  due_time TIME,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  reminder_1day BOOLEAN DEFAULT false,
  reminder_1hour BOOLEAN DEFAULT false,
  reminder_15min BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    PERFORM safe_add_column('tasks', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('tasks', 'counselor_id', 'UUID', NULL, false);
    PERFORM safe_add_column('tasks', 'student_id', 'UUID', NULL, false);
    PERFORM safe_add_column('tasks', 'title', 'VARCHAR(255)', NULL, false);
    PERFORM safe_add_column('tasks', 'description', 'TEXT', NULL, false);
    PERFORM safe_add_column('tasks', 'due_date', 'DATE', NULL, false);
    PERFORM safe_add_column('tasks', 'due_time', 'TIME', NULL, false);
    PERFORM safe_add_column('tasks', 'priority', 'VARCHAR(20)', '''medium''', false);
    PERFORM safe_add_column('tasks', 'status', 'VARCHAR(50)', '''pending''', false);
    PERFORM safe_add_column('tasks', 'completed_at', 'TIMESTAMP WITH TIME ZONE', NULL, false);
    PERFORM safe_add_column('tasks', 'comments', 'TEXT', NULL, false);
    PERFORM safe_add_column('tasks', 'reminder_1day', 'BOOLEAN', 'false', false);
    PERFORM safe_add_column('tasks', 'reminder_1hour', 'BOOLEAN', 'false', false);
    PERFORM safe_add_column('tasks', 'reminder_15min', 'BOOLEAN', 'false', false);
    PERFORM safe_add_column('tasks', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('tasks', 'updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'counselor_id') THEN
      PERFORM safe_create_index('idx_tasks_counselor', 'tasks', 'counselor_id', false);
      PERFORM safe_create_index('idx_tasks_counselor_status', 'tasks', 'counselor_id, status', false);
      PERFORM safe_create_index('idx_tasks_counselor_due_date', 'tasks', 'counselor_id, due_date', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'student_id') THEN
      PERFORM safe_create_index('idx_tasks_student', 'tasks', 'student_id', false, 'student_id IS NOT NULL');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
      PERFORM safe_create_index('idx_tasks_due_date', 'tasks', 'due_date', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN
      PERFORM safe_create_index('idx_tasks_status', 'tasks', 'status', false);
    END IF;
  END IF;
END $$;

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    PERFORM safe_add_column('conversations', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('conversations', 'counselor_id', 'UUID', NULL, false);
    PERFORM safe_add_column('conversations', 'title', 'VARCHAR(255)', NULL, false);
    PERFORM safe_add_column('conversations', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('conversations', 'updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'counselor_id') THEN
      PERFORM safe_create_index('idx_conversations_counselor', 'conversations', 'counselor_id', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'updated_at') THEN
      PERFORM safe_create_index('idx_conversations_updated', 'conversations', 'updated_at', false);
    END IF;
  END IF;
END $$;

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  role VARCHAR(20),
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    PERFORM safe_add_column('messages', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('messages', 'conversation_id', 'UUID', NULL, false);
    PERFORM safe_add_column('messages', 'role', 'VARCHAR(20)', NULL, false);
    PERFORM safe_add_column('messages', 'content', 'TEXT', NULL, false);
    PERFORM safe_add_column('messages', 'metadata', 'JSONB', NULL, false);
    PERFORM safe_add_column('messages', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
      PERFORM safe_create_index('idx_messages_conversation', 'messages', 'conversation_id', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
      PERFORM safe_create_index('idx_messages_created', 'messages', 'created_at', false);
    END IF;
  END IF;
END $$;

-- ============================================
-- LETTERS OF RECOMMENDATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS letters_of_recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  counselor_id UUID,
  student_college_id UUID,
  program_type VARCHAR(100),
  relationship_type VARCHAR(100),
  relationship_duration VARCHAR(100),
  relationship_context TEXT,
  specific_examples TEXT,
  generated_content TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'letters_of_recommendation') THEN
    PERFORM safe_add_column('letters_of_recommendation', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('letters_of_recommendation', 'student_id', 'UUID', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'counselor_id', 'UUID', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'student_college_id', 'UUID', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'program_type', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'relationship_type', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'relationship_duration', 'VARCHAR(100)', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'relationship_context', 'TEXT', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'specific_examples', 'TEXT', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'generated_content', 'TEXT', NULL, false);
    PERFORM safe_add_column('letters_of_recommendation', 'status', 'VARCHAR(50)', '''draft''', false);
    PERFORM safe_add_column('letters_of_recommendation', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('letters_of_recommendation', 'updated_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'letters_of_recommendation') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters_of_recommendation' AND column_name = 'student_id') THEN
      PERFORM safe_create_index('idx_lors_student', 'letters_of_recommendation', 'student_id', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters_of_recommendation' AND column_name = 'counselor_id') THEN
      PERFORM safe_create_index('idx_lors_counselor', 'letters_of_recommendation', 'counselor_id', false);
    END IF;
  END IF;
END $$;

-- ============================================
-- AI TASK SUGGESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_task_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID,
  student_id UUID,
  suggestion_type VARCHAR(50),
  suggestion_text TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_task_suggestions') THEN
    PERFORM safe_add_column('ai_task_suggestions', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('ai_task_suggestions', 'counselor_id', 'UUID', NULL, false);
    PERFORM safe_add_column('ai_task_suggestions', 'student_id', 'UUID', NULL, false);
    PERFORM safe_add_column('ai_task_suggestions', 'suggestion_type', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('ai_task_suggestions', 'suggestion_text', 'TEXT', NULL, false);
    PERFORM safe_add_column('ai_task_suggestions', 'priority', 'VARCHAR(20)', '''medium''', false);
    PERFORM safe_add_column('ai_task_suggestions', 'metadata', 'JSONB', NULL, false);
    PERFORM safe_add_column('ai_task_suggestions', 'status', 'VARCHAR(50)', '''active''', false);
    PERFORM safe_add_column('ai_task_suggestions', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
    PERFORM safe_add_column('ai_task_suggestions', 'expires_at', 'TIMESTAMP WITH TIME ZONE', NULL, false);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_task_suggestions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_task_suggestions' AND column_name = 'counselor_id') THEN
      PERFORM safe_create_index('idx_suggestions_counselor', 'ai_task_suggestions', 'counselor_id', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_task_suggestions' AND column_name = 'status') THEN
      PERFORM safe_create_index('idx_suggestions_status', 'ai_task_suggestions', 'status', false);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_task_suggestions' AND column_name = 'expires_at') THEN
      PERFORM safe_create_index('idx_suggestions_expires', 'ai_task_suggestions', 'expires_at', false, 'expires_at IS NOT NULL');
    END IF;
  END IF;
END $$;

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  link_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    PERFORM safe_add_column('notifications', 'id', 'UUID', 'gen_random_uuid()', false);
    PERFORM safe_add_column('notifications', 'user_id', 'UUID', NULL, false);
    PERFORM safe_add_column('notifications', 'type', 'VARCHAR(50)', NULL, false);
    PERFORM safe_add_column('notifications', 'title', 'VARCHAR(255)', NULL, false);
    PERFORM safe_add_column('notifications', 'message', 'TEXT', NULL, false);
    PERFORM safe_add_column('notifications', 'link_url', 'TEXT', NULL, false);
    PERFORM safe_add_column('notifications', 'is_read', 'BOOLEAN', 'false', false);
    PERFORM safe_add_column('notifications', 'read_at', 'TIMESTAMP WITH TIME ZONE', NULL, false);
    PERFORM safe_add_column('notifications', 'created_at', 'TIMESTAMP WITH TIME ZONE', 'NOW()', false);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
      PERFORM safe_create_index('idx_notifications_user', 'notifications', 'user_id', false);
      PERFORM safe_create_index('idx_notifications_unread', 'notifications', 'user_id, is_read', false, 'is_read = false');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'created_at') THEN
      PERFORM safe_create_index('idx_notifications_created', 'notifications', 'created_at', false);
    END IF;
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables (safe - won't fail if already enabled)
DO $$ 
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Ignore errors if RLS already enabled or table doesn't exist
    END;
  END LOOP;
END $$;

-- Create RLS policies (only if they don't exist)
-- Note: CREATE POLICY cannot be executed dynamically, so we check and create individually

-- Users: Can view their own record (only if users.id is UUID)
-- SKIP: Users table has bigint id, not UUID. Policy will be created separately after migration.
-- DO $$ 
-- BEGIN
--   -- Only create policy if users.id is UUID (matches auth.uid())
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_name = 'users' 
--     AND column_name = 'id' 
--     AND data_type = 'uuid'
--   ) THEN
--     IF NOT EXISTS (
--       SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile'
--     ) THEN
--       CREATE POLICY "Users can view own profile"
--         ON users FOR SELECT
--         USING (auth.uid() = id);
--     END IF;
--   END IF;
-- END $$;

-- Students policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can view own students') THEN
      CREATE POLICY "Counselors can view own students"
        ON students FOR SELECT
        USING (auth.uid() = counselor_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can insert own students') THEN
      CREATE POLICY "Counselors can insert own students"
        ON students FOR INSERT
        WITH CHECK (auth.uid() = counselor_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can update own students') THEN
      CREATE POLICY "Counselors can update own students"
        ON students FOR UPDATE
        USING (auth.uid() = counselor_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can delete own students') THEN
      CREATE POLICY "Counselors can delete own students"
        ON students FOR DELETE
        USING (auth.uid() = counselor_id);
    END IF;
  END IF;
END $$;

-- Tasks policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage own tasks') THEN
      CREATE POLICY "Counselors can manage own tasks"
        ON tasks FOR ALL
        USING (auth.uid() = counselor_id);
    END IF;
  END IF;
END $$;

-- Notes policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage notes') THEN
      CREATE POLICY "Counselors can manage notes"
        ON notes FOR ALL
        USING (auth.uid() = counselor_id);
    END IF;
  END IF;
END $$;

-- Conversations policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage own conversations') THEN
      CREATE POLICY "Counselors can manage own conversations"
        ON conversations FOR ALL
        USING (auth.uid() = counselor_id);
    END IF;
  END IF;
END $$;

-- Notifications policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own notifications') THEN
      CREATE POLICY "Users can manage own notifications"
        ON notifications FOR ALL
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- Student Colleges policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_colleges') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage student colleges') THEN
      CREATE POLICY "Counselors can manage student colleges"
        ON student_colleges FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM students
            WHERE students.id = student_colleges.student_id
            AND students.counselor_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- Essays policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essays') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage essays') THEN
      CREATE POLICY "Counselors can manage essays"
        ON essays FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM students
            WHERE students.id = essays.student_id
            AND students.counselor_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- Activities policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage activities') THEN
      CREATE POLICY "Counselors can manage activities"
        ON activities FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM students
            WHERE students.id = activities.student_id
            AND students.counselor_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- Messages policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage messages') THEN
      CREATE POLICY "Counselors can manage messages"
        ON messages FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.counselor_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

-- Letters of Recommendation policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'letters_of_recommendation') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage LORs') THEN
      CREATE POLICY "Counselors can manage LORs"
        ON letters_of_recommendation FOR ALL
        USING (auth.uid() = counselor_id);
    END IF;
  END IF;
END $$;

-- AI Task Suggestions policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_task_suggestions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Counselors can manage suggestions') THEN
      CREATE POLICY "Counselors can manage suggestions"
        ON ai_task_suggestions FOR ALL
        USING (auth.uid() = counselor_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (only if table and column exist)
DO $$ 
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = tbl_name 
      AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;
        CREATE TRIGGER update_%s_updated_at 
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      ', tbl_name, tbl_name, tbl_name, tbl_name);
    END IF;
  END LOOP;
END $$;
