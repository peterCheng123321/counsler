-- Function to safely create indexes only if columns exist
CREATE OR REPLACE FUNCTION create_index_if_column_exists(
  index_name TEXT,
  table_name TEXT,
  column_name TEXT,
  unique_index BOOLEAN DEFAULT false
) RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = create_index_if_column_exists.table_name
    AND column_name = create_index_if_column_exists.column_name
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = create_index_if_column_exists.index_name
    ) THEN
      IF unique_index THEN
        EXECUTE format('CREATE UNIQUE INDEX %I ON %I(%I)', 
          create_index_if_column_exists.index_name,
          create_index_if_column_exists.table_name,
          create_index_if_column_exists.column_name
        );
      ELSE
        EXECUTE format('CREATE INDEX %I ON %I(%I)', 
          create_index_if_column_exists.index_name,
          create_index_if_column_exists.table_name,
          create_index_if_column_exists.column_name
        );
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: session_preload_libraries requires superuser privileges
-- This is not needed for RLS - RLS is enabled per-table below
-- ALTER DATABASE postgres SET session_preload_libraries = 'pg_stat_statements';

-- Users table (counselors/advisors)
-- Note: This table syncs with Supabase Auth's auth.users table
-- The id should match auth.users.id for proper integration
-- Handle existing table structure
DO $$ 
BEGIN
  -- Check if users table exists and what type the id column is
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    -- If id is bigint, we need to migrate - but for now, let's check if we can alter it
    -- For MVP, we'll work with existing structure if it's different
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'bigint'
    ) THEN
      -- Existing table has bigint - create a separate migration is needed
      -- For now, we'll skip the foreign key constraint
      RAISE NOTICE 'Users table exists with bigint id - foreign key constraints will be skipped';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  -- password_hash removed - using Supabase Auth (Google OAuth)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'counselor',
  organization_id UUID, -- Prepared for Phase 2 RBAC
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Add missing columns if table exists
DO $$ 
BEGIN
  -- Add organization_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE users ADD COLUMN organization_id UUID;
  END IF;
  
  -- Remove password_hash if it exists (we're using Supabase Auth)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users DROP COLUMN password_hash;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id) WHERE organization_id IS NOT NULL;

-- Function to sync user from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    last_login = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL ,
  school_id UUID, -- Prepared for Phase 2 RBAC
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  graduation_year INTEGER NOT NULL,
  
  -- Academic info
  gpa_unweighted DECIMAL(3,2),
  gpa_weighted DECIMAL(3,2),
  class_rank INTEGER,
  class_size INTEGER,
  sat_score INTEGER,
  sat_ebrw INTEGER,
  sat_math INTEGER,
  act_score INTEGER,
  
  -- Progress tracking
  application_progress INTEGER DEFAULT 0 CHECK (application_progress >= 0 AND application_progress <= 100),
  
  -- Metadata
  profile_picture_url TEXT,
  resume_url TEXT,
  transcript_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_counselor ON students(counselor_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_counselor_school ON students(counselor_id, school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_grad_year ON students(graduation_year);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(last_name, first_name);

-- Full-text search index for students
CREATE INDEX IF NOT EXISTS idx_students_fts ON students USING gin(
  to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, ''))
);

-- Colleges table
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location_city VARCHAR(100),
  location_state VARCHAR(50),
  location_country VARCHAR(100) DEFAULT 'USA',
  type VARCHAR(50), -- public, private, etc.
  acceptance_rate DECIMAL(5,2),
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colleges_name ON colleges(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_colleges_name_location ON colleges(name, location_city, location_state) WHERE location_city IS NOT NULL AND location_state IS NOT NULL;

-- Student Colleges (Many-to-Many)
CREATE TABLE IF NOT EXISTS student_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL ,
  college_id UUID NOT NULL ,
  
  -- Application details
  application_type VARCHAR(50) NOT NULL CHECK (application_type IN ('EA', 'ED', 'RD', 'Rolling')),
  deadline DATE NOT NULL,
  college_type VARCHAR(50) NOT NULL CHECK (college_type IN ('Safety', 'Target', 'Reach')),
  application_portal VARCHAR(50), -- Common App, Coalition, etc.
  
  -- Progress tracking
  application_status VARCHAR(50) DEFAULT 'not_started' CHECK (application_status IN ('not_started', 'in_progress', 'submitted', 'accepted', 'rejected', 'waitlisted')),
  application_progress INTEGER DEFAULT 0 CHECK (application_progress >= 0 AND application_progress <= 100),
  
  -- Requirements tracking
  essays_required INTEGER DEFAULT 0,
  essays_completed INTEGER DEFAULT 0,
  lors_required INTEGER DEFAULT 0,
  lors_completed INTEGER DEFAULT 0,
  transcript_requested BOOLEAN DEFAULT false,
  transcript_received BOOLEAN DEFAULT false,
  test_scores_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_student_colleges_student ON student_colleges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_colleges_deadline ON student_colleges(deadline);
CREATE INDEX IF NOT EXISTS idx_student_colleges_status ON student_colleges(application_status);

-- Essays table
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

-- Conditionally create indexes for essays (only if columns exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essays') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'student_id') THEN
      CREATE INDEX IF NOT EXISTS idx_essays_student ON essays(student_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essays' AND column_name = 'student_college_id') THEN
      CREATE INDEX IF NOT EXISTS idx_essays_student_college ON essays(student_college_id) WHERE student_college_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL ,
  
  activity_name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  description TEXT,
  
  participation_grades TEXT[], -- ['9th', '10th', '11th', '12th']
  timing VARCHAR(50), -- school_year, summer, year_round
  hours_per_week INTEGER,
  weeks_per_year INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_student ON activities(student_id);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL ,
  counselor_id UUID NOT NULL ,
  
  note_type VARCHAR(50) NOT NULL CHECK (note_type IN ('general', 'meeting', 'reminder', 'priority')),
  content TEXT NOT NULL,
  
  reminder_date TIMESTAMP WITH TIME ZONE,
  is_priority BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_student ON notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_reminder ON notes(reminder_date) WHERE reminder_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_counselor ON notes(counselor_id);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL ,
  student_id UUID ,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  comments TEXT,
  
  -- Reminders
  reminder_1day BOOLEAN DEFAULT false,
  reminder_1hour BOOLEAN DEFAULT false,
  reminder_15min BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_counselor ON tasks(counselor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_student ON tasks(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_counselor_status ON tasks(counselor_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_counselor_due_date ON tasks(counselor_id, due_date);

-- Conversations table (Chatbot)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL ,
  
  title VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_counselor ON conversations(counselor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Messages table (Chatbot)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL ,
  
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Metadata for suggestions/actions
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Letters of Recommendation table
CREATE TABLE IF NOT EXISTS letters_of_recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL ,
  counselor_id UUID NOT NULL ,
  student_college_id UUID ,
  
  program_type VARCHAR(100),
  relationship_type VARCHAR(100),
  relationship_duration VARCHAR(100),
  relationship_context TEXT,
  
  specific_examples TEXT,
  
  generated_content TEXT,
  
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'finalized')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lors_student ON letters_of_recommendation(student_id);
CREATE INDEX IF NOT EXISTS idx_lors_counselor ON letters_of_recommendation(counselor_id);

-- AI Task Suggestions table
CREATE TABLE IF NOT EXISTS ai_task_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL ,
  student_id UUID ,
  
  suggestion_type VARCHAR(50) NOT NULL,
  suggestion_text TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  metadata JSONB,
  
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'dismissed')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_suggestions_counselor ON ai_task_suggestions(counselor_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON ai_task_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_expires ON ai_task_suggestions(expires_at) WHERE expires_at IS NOT NULL;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL ,
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  link_url TEXT,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Row Level Security Policies (Phase 1: counselor_id based)
-- Note: Full RBAC with organization_id will be added in Phase 2

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters_of_recommendation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_task_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: Can view their own record
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Students: Counselors can only see their own students
CREATE POLICY "Counselors can view own students"
  ON students FOR SELECT
  USING (auth.uid() = counselor_id);

CREATE POLICY "Counselors can insert own students"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = counselor_id);

CREATE POLICY "Counselors can update own students"
  ON students FOR UPDATE
  USING (auth.uid() = counselor_id);

CREATE POLICY "Counselors can delete own students"
  ON students FOR DELETE
  USING (auth.uid() = counselor_id);

-- Student Colleges: Access through student relationship
CREATE POLICY "Counselors can manage student colleges"
  ON student_colleges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_colleges.student_id
      AND students.counselor_id = auth.uid()
    )
  );

-- Essays: Access through student relationship
CREATE POLICY "Counselors can manage essays"
  ON essays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = essays.student_id
      AND students.counselor_id = auth.uid()
    )
  );

-- Activities: Access through student relationship
CREATE POLICY "Counselors can manage activities"
  ON activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = activities.student_id
      AND students.counselor_id = auth.uid()
    )
  );

-- Notes: Counselors can manage their own notes
CREATE POLICY "Counselors can manage notes"
  ON notes FOR ALL
  USING (auth.uid() = counselor_id);

-- Tasks: Counselors can manage their own tasks
CREATE POLICY "Counselors can manage own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = counselor_id);

-- Conversations: Counselors can manage their own conversations
CREATE POLICY "Counselors can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = counselor_id);

-- Messages: Access through conversation relationship
CREATE POLICY "Counselors can manage messages"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.counselor_id = auth.uid()
    )
  );

-- Letters of Recommendation: Counselors can manage their own LORs
CREATE POLICY "Counselors can manage LORs"
  ON letters_of_recommendation FOR ALL
  USING (auth.uid() = counselor_id);

-- AI Task Suggestions: Counselors can manage their own suggestions
CREATE POLICY "Counselors can manage suggestions"
  ON ai_task_suggestions FOR ALL
  USING (auth.uid() = counselor_id);

-- Notifications: Users can manage their own notifications
CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- Colleges: Public read access (no RLS needed for now)
-- In Phase 2, we may add organization-specific college lists

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_colleges_updated_at BEFORE UPDATE ON student_colleges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_essays_updated_at BEFORE UPDATE ON essays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lors_updated_at BEFORE UPDATE ON letters_of_recommendation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

