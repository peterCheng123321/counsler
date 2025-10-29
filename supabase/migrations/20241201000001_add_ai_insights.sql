-- AI Insights and Analysis Tables Migration
-- Adds tables for storing AI-generated insights, risk scores, recommendations, and analysis runs

-- Insights table: stores AI-generated insights about students, tasks, or other entities
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('student', 'task', 'cohort', 'workspace')),
  entity_id UUID, -- Can be null for workspace-level insights
  kind VARCHAR(100) NOT NULL, -- e.g., 'risk_score', 'workload_forecast', 'anomaly', 'summary', 'recommendation'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Demo mode tagging
  demo BOOLEAN DEFAULT false,
  demo_workspace_id UUID
);

CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_entity ON insights(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insights_kind ON insights(kind);
CREATE INDEX IF NOT EXISTS idx_insights_created ON insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_demo ON insights(demo, demo_workspace_id) WHERE demo = true;

-- Student risk scores table: stores calculated risk scores for students
CREATE TABLE IF NOT EXISTS student_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  rationale TEXT NOT NULL,
  factors JSONB DEFAULT '{}', -- Stores contributing factors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Demo mode tagging
  demo BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_student ON student_risk_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_created ON student_risk_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_demo ON student_risk_scores(demo) WHERE demo = true;

-- Task recommendations table: stores AI recommendations for tasks
CREATE TABLE IF NOT EXISTS task_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL,
  recommendation_type VARCHAR(50) NOT NULL, -- e.g., 'due_date', 'priority', 'duplicate', 'blocker'
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Demo mode tagging
  demo BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_recommendations_task ON task_recommendations(task_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON task_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_created ON task_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_demo ON task_recommendations(demo) WHERE demo = true;

-- Analysis runs table: tracks when analysis modules were executed
CREATE TABLE IF NOT EXISTS analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  module VARCHAR(100) NOT NULL, -- e.g., 'risk_scoring', 'workload_forecast', 'anomaly_detection'
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- Demo mode tagging
  demo BOOLEAN DEFAULT false,
  demo_workspace_id UUID
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_user ON analysis_runs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analysis_runs_module ON analysis_runs(module);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status ON analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_started ON analysis_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_demo ON analysis_runs(demo, demo_workspace_id) WHERE demo = true;

-- Enable RLS on all new tables
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insights
-- Regular users: can only see their own insights
CREATE POLICY "Users can view own insights"
  ON insights FOR SELECT
  USING (auth.uid() = user_id);

-- Regular users: can insert their own insights
CREATE POLICY "Users can insert own insights"
  ON insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Regular users: can update their own insights
CREATE POLICY "Users can update own insights"
  ON insights FOR UPDATE
  USING (auth.uid() = user_id);

-- Regular users: can delete their own insights
CREATE POLICY "Users can delete own insights"
  ON insights FOR DELETE
  USING (auth.uid() = user_id);

-- Demo mode: authenticated users can read demo insights
CREATE POLICY "Demo insights are publicly readable for authenticated users"
  ON insights FOR SELECT
  USING (
    demo = true AND 
    auth.uid() IS NOT NULL AND
    (demo_workspace_id IS NULL OR demo_workspace_id = (SELECT id FROM users WHERE id = auth.uid() LIMIT 1))
  );

-- RLS Policies for student_risk_scores
-- Access through student relationship (student must belong to counselor)
CREATE POLICY "Counselors can view risk scores for own students"
  ON student_risk_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_risk_scores.student_id
      AND students.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can insert risk scores for own students"
  ON student_risk_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_risk_scores.student_id
      AND students.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can update risk scores for own students"
  ON student_risk_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_risk_scores.student_id
      AND students.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can delete risk scores for own students"
  ON student_risk_scores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_risk_scores.student_id
      AND students.counselor_id = auth.uid()
    )
  );

-- Demo mode: authenticated users can read demo risk scores
CREATE POLICY "Demo risk scores are publicly readable for authenticated users"
  ON student_risk_scores FOR SELECT
  USING (demo = true AND auth.uid() IS NOT NULL);

-- RLS Policies for task_recommendations
-- Access through task relationship (task must belong to counselor)
CREATE POLICY "Counselors can view recommendations for own tasks"
  ON task_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_recommendations.task_id
      AND tasks.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can insert recommendations for own tasks"
  ON task_recommendations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_recommendations.task_id
      AND tasks.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can update recommendations for own tasks"
  ON task_recommendations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_recommendations.task_id
      AND tasks.counselor_id = auth.uid()
    )
  );

CREATE POLICY "Counselors can delete recommendations for own tasks"
  ON task_recommendations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_recommendations.task_id
      AND tasks.counselor_id = auth.uid()
    )
  );

-- Demo mode: authenticated users can read demo recommendations
CREATE POLICY "Demo recommendations are publicly readable for authenticated users"
  ON task_recommendations FOR SELECT
  USING (demo = true AND auth.uid() IS NOT NULL);

-- RLS Policies for analysis_runs
-- Users can view their own analysis runs
CREATE POLICY "Users can view own analysis runs"
  ON analysis_runs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own analysis runs"
  ON analysis_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own analysis runs"
  ON analysis_runs FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own analysis runs"
  ON analysis_runs FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Demo mode: authenticated users can read demo analysis runs
CREATE POLICY "Demo analysis runs are publicly readable for authenticated users"
  ON analysis_runs FOR SELECT
  USING (
    demo = true AND 
    auth.uid() IS NOT NULL AND
    (demo_workspace_id IS NULL OR demo_workspace_id = (SELECT id FROM users WHERE id = auth.uid() LIMIT 1))
  );

