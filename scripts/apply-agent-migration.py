#!/usr/bin/env python3
"""
Apply Agent Dashboard Migration to Supabase
Uses the Supabase REST API to execute SQL
"""

import requests
import json
import sys

# Supabase credentials
PROJECT_ID = "sxrpbbvqypzmkqjfrgev"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cnBiYnZxeXB6bWtxamZyZ2V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA1Njc1MywiZXhwIjoyMDc2NjMyNzUzfQ.2DYX9E0mVVdoIiiO-Fz-RJGt5YxsnUPZxHf3XfrbzaY"
SUPABASE_URL = f"https://{PROJECT_ID}.supabase.co"

# SQL to execute
SQL = """
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

-- IMPORTANT: Disable RLS for demo mode
ALTER TABLE agent_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights DISABLE ROW LEVEL SECURITY;
"""

def apply_migration():
    """Apply the agent dashboard migration"""
    print("🚀 Applying Agent Dashboard Migration\n")
    print("=" * 80)
    
    try:
        # Note: The Supabase REST API doesn't directly support arbitrary SQL execution
        # We need to use the management API or direct PostgreSQL connection
        print("⚠️  Note: Direct SQL execution via REST API is not available")
        print("\n📌 Please use one of these methods:\n")
        
        print("Method 1: Supabase Dashboard (Recommended)")
        print("1. Go to: https://supabase.com/dashboard")
        print("2. Select project: sxrpbbvqypzmkqjfrgev")
        print("3. Click SQL Editor → New Query")
        print("4. Paste the SQL from /tmp/agent_setup.sql")
        print("5. Click Run\n")
        
        print("Method 2: Supabase CLI")
        print("1. Install: npm install -g supabase")
        print("2. Link project: supabase link --project-ref sxrpbbvqypzmkqjfrgev")
        print("3. Push migrations: supabase db push\n")
        
        print("Method 3: psql (Direct PostgreSQL)")
        print("1. Get connection string from Supabase Dashboard")
        print("2. Run: psql <connection_string> < /tmp/agent_setup.sql\n")
        
        print("=" * 80)
        print("\n✅ SQL file prepared at: /tmp/agent_setup.sql")
        print("📋 Copy and paste into Supabase Dashboard SQL Editor\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
