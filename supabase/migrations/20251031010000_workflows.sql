-- Create workflows tables for automation
-- Workflows define reusable multi-step processes
-- Workflow runs track execution of workflows

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
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
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
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_counselor ON workflows(counselor_id, enabled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON workflows(trigger_type, enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_step_logs_run ON workflow_step_logs(workflow_run_id, step_index);

-- Disable RLS for demo mode
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_logs DISABLE ROW LEVEL SECURITY;

-- Function to cleanup old workflow runs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_workflow_runs()
RETURNS void AS $$
BEGIN
  DELETE FROM workflow_runs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE workflows IS 'Reusable workflow definitions for automation';
COMMENT ON TABLE workflow_runs IS 'Execution history of workflows';
COMMENT ON TABLE workflow_step_logs IS 'Detailed logs for each step in a workflow run';
COMMENT ON COLUMN workflows.steps IS 'Array of step definitions with type, config, and dependencies';
COMMENT ON COLUMN workflows.trigger_config IS 'Configuration for how/when workflow is triggered';
COMMENT ON COLUMN workflow_runs.step_results IS 'Array of results from each executed step';
