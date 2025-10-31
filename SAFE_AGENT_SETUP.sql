-- Safe Agent Tables Setup - Handles existing objects gracefully
-- Run this in Supabase SQL Editor

-- Create agent tables
CREATE TABLE IF NOT EXISTS agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL,
  daily_digest_enabled BOOLEAN DEFAULT true,
  daily_digest_time TIME DEFAULT '08:00:00',
  deadline_monitor_enabled BOOLEAN DEFAULT true,
  deadline_monitor_interval_hours INTEGER DEFAULT 6,
  risk_assessment_enabled BOOLEAN DEFAULT true,
  risk_assessment_interval_hours INTEGER DEFAULT 24,
  max_runs_per_hour INTEGER DEFAULT 5,
  max_insights_per_run INTEGER DEFAULT 10,
  autonomous_actions_enabled BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": false, "in_app": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(counselor_id)
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL,
  run_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  insights_count INTEGER DEFAULT 0,
  tools_used JSONB DEFAULT '[]',
  execution_time_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID,
  counselor_id UUID NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  finding TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  acted_on_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_agent_runs_counselor_created ON agent_runs(counselor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_type_status ON agent_runs(run_type, status);
CREATE INDEX IF NOT EXISTS idx_agent_insights_counselor_active ON agent_insights(counselor_id, status, created_at DESC) WHERE status = 'active';

-- Add foreign key constraint safely (checks if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_insights_agent_run_id_fkey'
  ) THEN
    ALTER TABLE agent_insights
    ADD CONSTRAINT agent_insights_agent_run_id_fkey
    FOREIGN KEY (agent_run_id)
    REFERENCES agent_runs(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Disable RLS for demo mode
ALTER TABLE agent_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights DISABLE ROW LEVEL SECURITY;

-- Create agent_checkpoints table for persistent LangGraph memory
CREATE TABLE IF NOT EXISTS agent_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  checkpoint_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(thread_id, checkpoint_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_thread ON agent_checkpoints(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_checkpoint_id ON agent_checkpoints(checkpoint_id);

-- Disable RLS for demo mode
ALTER TABLE agent_checkpoints DISABLE ROW LEVEL SECURITY;

-- Add cleanup function to remove old checkpoints (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_checkpoints()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_checkpoints
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create workflows tables for automation
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'event')),
  trigger_config JSONB DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  counselor_id UUID NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  step_results JSONB DEFAULT '[]',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL,
  step_index INTEGER NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  step_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER
);

-- Add workflow foreign keys safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflow_runs_workflow_id_fkey'
  ) THEN
    ALTER TABLE workflow_runs
    ADD CONSTRAINT workflow_runs_workflow_id_fkey
    FOREIGN KEY (workflow_id)
    REFERENCES workflows(id)
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflow_step_logs_workflow_run_id_fkey'
  ) THEN
    ALTER TABLE workflow_step_logs
    ADD CONSTRAINT workflow_step_logs_workflow_run_id_fkey
    FOREIGN KEY (workflow_run_id)
    REFERENCES workflow_runs(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_counselor ON workflows(counselor_id, enabled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON workflows(trigger_type, enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_step_logs_run ON workflow_step_logs(workflow_run_id, step_index);

-- Disable RLS for workflow tables
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_logs DISABLE ROW LEVEL SECURITY;

-- Workflow cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_workflow_runs()
RETURNS void AS $$
BEGIN
  DELETE FROM workflow_runs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Verify tables were created
SELECT 'Setup complete! Created ' || COUNT(*) || ' tables.' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE 'agent_%' OR table_name LIKE 'workflow%');
