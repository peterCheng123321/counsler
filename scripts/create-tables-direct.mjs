/**
 * Create agent tables directly via SQL
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createTables() {
  console.log('🚀 Creating agent system tables...\n');

  // Table 1: agent_config
  console.log('Creating agent_config table...');
  const { error: configError } = await supabase.rpc('exec_sql', {
    sql_string: `
      CREATE TABLE IF NOT EXISTS agent_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    `
  });

  if (configError) console.log('  ⚠️  Error (may already exist):', configError.message);
  else console.log('  ✅ agent_config created');

  // Table 2: agent_runs
  console.log('\nCreating agent_runs table...');
  const { error: runsError } = await supabase.rpc('exec_sql', {
    sql_string: `
      CREATE TABLE IF NOT EXISTS agent_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    `
  });

  if (runsError) console.log('  ⚠️  Error (may already exist):', runsError.message);
  else console.log('  ✅ agent_runs created');

  // Table 3: agent_insights
  console.log('\nCreating agent_insights table...');
  const { error: insightsError } = await supabase.rpc('exec_sql', {
    sql_string: `
      CREATE TABLE IF NOT EXISTS agent_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
        counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    `
  });

  if (insightsError) console.log('  ⚠️  Error (may already exist):', insightsError.message);
  else console.log('  ✅ agent_insights created');

  // Create indexes
  console.log('\nCreating indexes...');

  await supabase.rpc('exec_sql', {
    sql_string: `CREATE INDEX IF NOT EXISTS idx_agent_runs_counselor_created ON agent_runs(counselor_id, created_at DESC);`
  });
  console.log('  ✅ idx_agent_runs_counselor_created');

  await supabase.rpc('exec_sql', {
    sql_string: `CREATE INDEX IF NOT EXISTS idx_agent_runs_type_status ON agent_runs(run_type, status);`
  });
  console.log('  ✅ idx_agent_runs_type_status');

  await supabase.rpc('exec_sql', {
    sql_string: `CREATE INDEX IF NOT EXISTS idx_agent_insights_counselor_active ON agent_insights(counselor_id, status, created_at DESC) WHERE status = 'active';`
  });
  console.log('  ✅ idx_agent_insights_counselor_active');

  await supabase.rpc('exec_sql', {
    sql_string: `CREATE INDEX IF NOT EXISTS idx_agent_insights_priority ON agent_insights(priority, created_at DESC) WHERE status = 'active';`
  });
  console.log('  ✅ idx_agent_insights_priority');

  // Enable RLS
  console.log('\nEnabling RLS...');
  await supabase.rpc('exec_sql', {
    sql_string: `ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;`
  });
  await supabase.rpc('exec_sql', {
    sql_string: `ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;`
  });
  await supabase.rpc('exec_sql', {
    sql_string: `ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;`
  });
  console.log('  ✅ RLS enabled on all tables');

  // Create policies
  console.log('\nCreating RLS policies...');

  const policies = [
    `CREATE POLICY agent_config_select ON agent_config FOR SELECT USING (counselor_id = auth.uid());`,
    `CREATE POLICY agent_config_insert ON agent_config FOR INSERT WITH CHECK (counselor_id = auth.uid());`,
    `CREATE POLICY agent_config_update ON agent_config FOR UPDATE USING (counselor_id = auth.uid());`,
    `CREATE POLICY agent_runs_select ON agent_runs FOR SELECT USING (counselor_id = auth.uid());`,
    `CREATE POLICY agent_runs_insert ON agent_runs FOR INSERT WITH CHECK (counselor_id = auth.uid());`,
    `CREATE POLICY agent_insights_select ON agent_insights FOR SELECT USING (counselor_id = auth.uid());`,
    `CREATE POLICY agent_insights_insert ON agent_insights FOR INSERT WITH CHECK (counselor_id = auth.uid());`,
    `CREATE POLICY agent_insights_update ON agent_insights FOR UPDATE USING (counselor_id = auth.uid());`
  ];

  for (const policy of policies) {
    await supabase.rpc('exec_sql', { sql_string: policy });
  }
  console.log('  ✅ All RLS policies created');

  // Create functions
  console.log('\nCreating functions...');

  await supabase.rpc('exec_sql', {
    sql_string: `
      CREATE OR REPLACE FUNCTION cleanup_expired_insights()
      RETURNS void AS $$
      BEGIN
        DELETE FROM agent_insights
        WHERE (expires_at IS NOT NULL AND expires_at < NOW())
           OR (created_at < NOW() - INTERVAL '30 days' AND status = 'dismissed');
      END;
      $$ LANGUAGE plpgsql;
    `
  });
  console.log('  ✅ cleanup_expired_insights');

  await supabase.rpc('exec_sql', {
    sql_string: `
      CREATE OR REPLACE FUNCTION update_agent_config_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `
  });
  console.log('  ✅ update_agent_config_timestamp');

  await supabase.rpc('exec_sql', {
    sql_string: `
      CREATE TRIGGER agent_config_updated_at
        BEFORE UPDATE ON agent_config
        FOR EACH ROW
        EXECUTE FUNCTION update_agent_config_timestamp();
    `
  });
  console.log('  ✅ agent_config_updated_at trigger');

  // Verify
  console.log('\n🔍 Verifying tables...\n');

  const tables = ['agent_config', 'agent_runs', 'agent_insights'];
  let allExist = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('count').limit(0);
    if (error) {
      console.log(`❌ ${table}: NOT FOUND`);
      allExist = false;
    } else {
      console.log(`✅ ${table}: EXISTS`);
    }
  }

  if (allExist) {
    console.log('\n🎉 All tables created successfully!');
    console.log('\nNext steps:');
    console.log('  1. Visit /agent-dashboard');
    console.log('  2. Click "Run Agent Now"');
    console.log('  3. Check Insights tab\n');
  } else {
    console.log('\n⚠️  Manual setup required via Supabase Dashboard\n');
  }
}

createTables();
