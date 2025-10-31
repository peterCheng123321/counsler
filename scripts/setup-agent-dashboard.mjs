/**
 * Setup Agent Dashboard Tables
 * This script provides instructions for setting up the agent dashboard in Supabase
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupAgentDashboard() {
  try {
    console.log('📋 Agent Dashboard Setup Instructions\n');
    console.log('═'.repeat(80));

    const sql = `-- Create agent tables for demo mode (RLS disabled)

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

-- IMPORTANT: Disable RLS for demo mode
ALTER TABLE agent_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights DISABLE ROW LEVEL SECURITY;`;

    console.log('✅ SQL Ready to Execute\n');
    console.log('📌 To apply this migration, follow these steps:\n');
    
    console.log('1️⃣  Open Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard\n');

    console.log('2️⃣  Select your project:');
    console.log('   Project ID: sxrpbbvqypzmkqjfrgev\n');

    console.log('3️⃣  Navigate to SQL Editor:');
    console.log('   Click "SQL Editor" in the left sidebar\n');

    console.log('4️⃣  Create a new query:');
    console.log('   Click "New query" button\n');

    console.log('5️⃣  Copy and paste the SQL below:\n');
    console.log('═'.repeat(80));
    console.log(sql);
    console.log('═'.repeat(80));

    console.log('\n6️⃣  Execute the query:');
    console.log('   Click "Run" button or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)\n');

    console.log('7️⃣  Verify success:');
    console.log('   Run this verification query:\n');
    console.log('   SELECT table_name FROM information_schema.tables');
    console.log('   WHERE table_schema = \'public\' AND table_name LIKE \'agent_%\';\n');

    console.log('   You should see 3 tables:');
    console.log('   - agent_config');
    console.log('   - agent_runs');
    console.log('   - agent_insights\n');

    console.log('8️⃣  Refresh Agent Dashboard:');
    console.log('   Go to http://localhost:3000/agent-dashboard\n');

    console.log('═'.repeat(80));
    console.log('✅ Setup instructions complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupAgentDashboard();
