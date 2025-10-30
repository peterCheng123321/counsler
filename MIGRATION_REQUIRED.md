# ⚠️ DATABASE MIGRATION REQUIRED

## Action Required: Manual Database Setup

The agent system requires three database tables that must be created manually via the Supabase Dashboard.

## How to Apply the Migration

### Option 1: Supabase Dashboard (5 minutes)

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select your project: `sxrpbbvqypzmkqjfrgev`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy & Execute SQL**
   - Open file: `supabase/migrations/20251030100000_agent_system.sql`
   - Copy the **entire contents** (5,797 characters)
   - Paste into SQL Editor
   - Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verify Success**
   You should see in the output:
   ```
   Success. No rows returned
   ```

5. **Confirm Tables Exist**
   Run this verification:
   ```bash
   node scripts/create-agent-tables.mjs
   ```

   Expected output:
   ```
   ✅ agent_config table exists
   ✅ agent_runs table exists
   ✅ agent_insights table exists
   ```

### Option 2: Supabase CLI (if installed)

```bash
# Make sure you're logged in
supabase login

# Link your project
supabase link --project-ref sxrpbbvqypzmkqjfrgev

# Apply the migration
supabase db push
```

## What Gets Created

### Tables (3)
- `agent_config` - Agent configuration and rate limits
- `agent_runs` - Execution history and metrics
- `agent_insights` - AI-generated recommendations

### Indexes (4)
- `idx_agent_runs_counselor_created` - Fast counselor queries
- `idx_agent_runs_type_status` - Status lookups
- `idx_agent_insights_counselor_active` - Active insights
- `idx_agent_insights_priority` - Priority filtering

### Functions (2)
- `cleanup_expired_insights()` - Remove old insights
- `update_agent_config_timestamp()` - Auto-update timestamps

### Security
- Row Level Security (RLS) enabled on all tables
- 8 RLS policies for user isolation

## Why Manual Setup?

Supabase doesn't allow raw SQL execution via the API for security reasons.
Tables must be created through:
- Supabase Dashboard SQL Editor ✅ (Recommended)
- Supabase CLI ✅
- Direct PostgreSQL connection ✅

## After Migration

Once the migration is applied:

1. **Test the Agent**
   ```bash
   # Visit the dashboard
   open http://localhost:3000/agent-dashboard

   # Or test via API
   curl -X POST http://localhost:3000/api/cron/agent-run \
     -H "Content-Type: application/json" \
     -d '{"runType": "manual"}'
   ```

2. **Verify Configuration**
   ```bash
   curl http://localhost:3000/api/v1/agent/config
   ```

3. **Check Insights**
   ```bash
   curl http://localhost:3000/api/v1/agent/insights?status=active
   ```

## Troubleshooting

### "Table does not exist" errors
- Migration not applied yet
- Apply SQL via Supabase Dashboard

### "Permission denied" errors
- RLS policies not created
- Re-run the full migration SQL

### "Function does not exist" errors
- Functions not created
- Check the SQL execution completed fully

## Need Help?

See full documentation: `AGENT_SETUP.md`

---

**Status**: ❌ Migration Pending
**File**: `supabase/migrations/20251030100000_agent_system.sql`
**Size**: 5,797 characters
**Tables**: 3
**Time**: ~2 minutes to apply
