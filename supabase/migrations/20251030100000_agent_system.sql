-- Agent System Tables
-- Efficient schema design to minimize backend load

-- Agent configuration table (single row for global config)
CREATE TABLE IF NOT EXISTS agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Scheduling configuration (prevents overload)
  daily_digest_enabled BOOLEAN DEFAULT true,
  daily_digest_time TIME DEFAULT '08:00:00', -- Run once per day
  deadline_monitor_enabled BOOLEAN DEFAULT true,
  deadline_monitor_interval_hours INTEGER DEFAULT 6, -- Run every 6 hours max
  risk_assessment_enabled BOOLEAN DEFAULT true,
  risk_assessment_interval_hours INTEGER DEFAULT 24, -- Run once per day max

  -- Rate limiting
  max_runs_per_hour INTEGER DEFAULT 5, -- Prevent overload
  max_insights_per_run INTEGER DEFAULT 10, -- Limit insight generation

  -- Agent behavior
  autonomous_actions_enabled BOOLEAN DEFAULT false, -- Safety: disabled by default
  notification_preferences JSONB DEFAULT '{"email": false, "in_app": true}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one config per counselor
  UNIQUE(counselor_id)
);

-- Agent runs table (track execution history)
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Run details
  run_type VARCHAR(50) NOT NULL, -- 'daily_digest', 'deadline_monitor', 'risk_assessment', 'manual'
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'

  -- Results (stored efficiently as JSONB)
  insights_count INTEGER DEFAULT 0,
  tools_used JSONB DEFAULT '[]', -- Array of tool names used
  execution_time_ms INTEGER, -- Track performance

  -- Error handling
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Index for efficient queries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent insights table (store generated insights)
CREATE TABLE IF NOT EXISTS agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Insight content
  category VARCHAR(50) NOT NULL, -- 'productivity', 'student_progress', 'trends', 'deadlines'
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  finding TEXT NOT NULL,
  recommendation TEXT NOT NULL,

  -- Metadata
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'dismissed', 'acted_on'
  expires_at TIMESTAMP WITH TIME ZONE, -- Auto-expire old insights

  -- User actions
  dismissed_at TIMESTAMP WITH TIME ZONE,
  acted_on_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries (prevent slow queries)
CREATE INDEX IF NOT EXISTS idx_agent_runs_counselor_created
  ON agent_runs(counselor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_type_status
  ON agent_runs(run_type, status);

CREATE INDEX IF NOT EXISTS idx_agent_insights_counselor_active
  ON agent_insights(counselor_id, status, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_agent_insights_priority
  ON agent_insights(priority, created_at DESC)
  WHERE status = 'active';

-- RLS Policies (security)
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;

-- Agent config policies
CREATE POLICY agent_config_select ON agent_config
  FOR SELECT USING (counselor_id = auth.uid());

CREATE POLICY agent_config_insert ON agent_config
  FOR INSERT WITH CHECK (counselor_id = auth.uid());

CREATE POLICY agent_config_update ON agent_config
  FOR UPDATE USING (counselor_id = auth.uid());

-- Agent runs policies
CREATE POLICY agent_runs_select ON agent_runs
  FOR SELECT USING (counselor_id = auth.uid());

CREATE POLICY agent_runs_insert ON agent_runs
  FOR INSERT WITH CHECK (counselor_id = auth.uid());

-- Agent insights policies
CREATE POLICY agent_insights_select ON agent_insights
  FOR SELECT USING (counselor_id = auth.uid());

CREATE POLICY agent_insights_insert ON agent_insights
  FOR INSERT WITH CHECK (counselor_id = auth.uid());

CREATE POLICY agent_insights_update ON agent_insights
  FOR UPDATE USING (counselor_id = auth.uid());

-- Function to clean up old insights (prevent database bloat)
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS void AS $$
BEGIN
  -- Delete insights older than 30 days or expired
  DELETE FROM agent_insights
  WHERE (expires_at IS NOT NULL AND expires_at < NOW())
     OR (created_at < NOW() - INTERVAL '30 days' AND status = 'dismissed');
END;
$$ LANGUAGE plpgsql;

-- Function to update agent_config updated_at
CREATE OR REPLACE FUNCTION update_agent_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_config_updated_at
  BEFORE UPDATE ON agent_config
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_config_timestamp();

-- Comments for documentation
COMMENT ON TABLE agent_config IS 'Agent configuration with rate limiting to prevent backend overload';
COMMENT ON TABLE agent_runs IS 'Agent execution history for monitoring and debugging';
COMMENT ON TABLE agent_insights IS 'Generated insights with auto-expiration to prevent bloat';
COMMENT ON COLUMN agent_config.max_runs_per_hour IS 'Rate limit to prevent backend overload (default: 5)';
COMMENT ON COLUMN agent_config.max_insights_per_run IS 'Limit insights per run to control database writes (default: 10)';
