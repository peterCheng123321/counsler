-- Add foreign key relationship between agent_insights and agent_runs
-- This allows PostgREST to perform joins

ALTER TABLE agent_insights
ADD CONSTRAINT agent_insights_agent_run_id_fkey
FOREIGN KEY (agent_run_id)
REFERENCES agent_runs(id)
ON DELETE SET NULL;

-- Comment
COMMENT ON CONSTRAINT agent_insights_agent_run_id_fkey ON agent_insights IS 'Links insights to the agent run that generated them';
