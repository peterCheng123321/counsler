# Fix Agent Dashboard - Setup Instructions

## Problem
The agent dashboard is showing 500 errors because the database tables don't exist yet.

Errors seen:
- `/api/v1/agent/config` - Failed to load resource (500)
- `/api/v1/agent/insights` - Failed to load resource (500)
- `/api/cron/agent-run` - Failed to load resource (500)

## Quick Fix: Run SQL in Supabase Dashboard

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run This SQL

```sql
-- Create agent tables for demo mode (RLS disabled)

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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_agent_runs_counselor_created ON agent_runs(counselor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_type_status ON agent_runs(run_type, status);
CREATE INDEX IF NOT EXISTS idx_agent_insights_counselor_active ON agent_insights(counselor_id, status, created_at DESC) WHERE status = 'active';

-- Add foreign key relationship
ALTER TABLE agent_insights
ADD CONSTRAINT agent_insights_agent_run_id_fkey
FOREIGN KEY (agent_run_id)
REFERENCES agent_runs(id)
ON DELETE SET NULL;

-- IMPORTANT: Disable RLS for demo mode
ALTER TABLE agent_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights DISABLE ROW LEVEL SECURITY;
```

### Step 3: Click "Run" Button
The SQL will execute and create the tables.

### Step 4: **IMPORTANT - Reload Schema Cache**
After creating the tables, you MUST reload the schema cache:

1. In Supabase Dashboard, click on **Settings** (gear icon in left sidebar)
2. Click **API** section
3. Scroll down to find the **Schema** section
4. Click the **Reload schema** button (or refresh icon)
5. Wait for the confirmation message

**This step is critical!** Without reloading the schema cache, Supabase won't see the new tables.

### Step 5: Verify Tables Exist
Run this verification query in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'agent_%';
```

You should see 3 tables:
- agent_config
- agent_runs
- agent_insights

### Step 6: Test the API
Navigate to http://localhost:3000/agent-dashboard - the page should now load without errors!

You can also test the API directly:
```bash
curl http://localhost:3000/api/v1/agent/config
```

Should return success response instead of 500 error.

## What This Does
- Creates 3 database tables for the agent system
- Disables Row Level Security (RLS) for demo mode
- Adds indexes for better performance
- Sets up default configuration values

## Troubleshooting

**Error: "Could not find the table 'public.agent_config' in the schema cache"**
You forgot to reload the schema cache! Go to Supabase Dashboard → Settings → API → Reload schema

**"relation already exists" error when running SQL**
This is fine - tables are already created. Continue to the schema reload step.

**Agent dashboard still shows 500 errors after everything**
1. **Did you reload the schema cache?** This is the most common issue!
2. Go to Supabase Dashboard → Settings → API → Click "Reload schema"
3. Wait 10-30 seconds for cache to refresh
4. Refresh your browser
5. Check the API: `curl http://localhost:3000/api/v1/agent/config`

**Verification checklist:**
- [ ] SQL ran successfully (tables created)
- [ ] Schema cache was reloaded in Supabase Dashboard
- [ ] All 3 tables appear in verification query
- [ ] RLS is disabled for all 3 tables
- [ ] Waited 30 seconds after schema reload
- [ ] Refreshed browser

**Need to delete and recreate tables**
```sql
DROP TABLE IF EXISTS agent_insights CASCADE;
DROP TABLE IF EXISTS agent_runs CASCADE;
DROP TABLE IF EXISTS agent_config CASCADE;
```
Then run the CREATE TABLE commands again.
