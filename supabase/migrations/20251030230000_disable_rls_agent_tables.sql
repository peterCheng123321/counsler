-- Disable RLS for agent tables in demo mode
-- This allows the admin client to access agent data without auth

-- Disable RLS on agent_config
ALTER TABLE IF EXISTS agent_config DISABLE ROW LEVEL SECURITY;

-- Disable RLS on agent_runs
ALTER TABLE IF EXISTS agent_runs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on agent_insights
ALTER TABLE IF EXISTS agent_insights DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS agent_config_select ON agent_config;
DROP POLICY IF EXISTS agent_config_insert ON agent_config;
DROP POLICY IF EXISTS agent_config_update ON agent_config;

DROP POLICY IF EXISTS agent_runs_select ON agent_runs;
DROP POLICY IF EXISTS agent_runs_insert ON agent_runs;

DROP POLICY IF EXISTS agent_insights_select ON agent_insights;
DROP POLICY IF EXISTS agent_insights_insert ON agent_insights;
DROP POLICY IF EXISTS agent_insights_update ON agent_insights;

-- Comments
COMMENT ON TABLE agent_config IS 'Agent configuration - RLS disabled for demo mode';
COMMENT ON TABLE agent_runs IS 'Agent execution history - RLS disabled for demo mode';
COMMENT ON TABLE agent_insights IS 'Generated insights - RLS disabled for demo mode';
