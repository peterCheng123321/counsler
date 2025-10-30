# Quick Start: Agent System

## ⚠️ Required: Apply Database Migration

Before using the agent system, you must create the database tables:

### Step 1: Open Supabase Dashboard

Go to: **https://supabase.com/dashboard/project/sxrpbbvqypzmkqjfrgev/sql/new**

### Step 2: Copy SQL

Copy the **entire contents** of this file:
```
supabase/migrations/20251030100000_agent_system.sql
```

### Step 3: Execute

1. Paste into the SQL Editor
2. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)
3. Wait for "Success. No rows returned"

### Step 4: Verify

Run this command to verify tables were created:
```bash
node scripts/create-agent-tables.mjs
```

Expected output:
```
✅ agent_config table exists
✅ agent_runs table exists
✅ agent_insights table exists
```

---

## Using the Agent System

Once migration is applied:

### 1. Visit Agent Dashboard

```bash
npm run dev
# Then open: http://localhost:3000/agent-dashboard
```

### 2. Run Manual Test

Click "Run Agent Now" button in dashboard

Or use API:
```bash
curl -X POST http://localhost:3000/api/cron/agent-run \
  -H "Content-Type: application/json" \
  -d '{"runType": "manual"}'
```

### 3. View Results

- **Insights Tab**: See AI-generated recommendations
- **Recent Runs Tab**: View execution history
- **Configuration Tab**: Adjust settings

---

## Features

✅ **Background Agent** - Autonomous scheduled runs
✅ **Rate Limiting** - Max 5 runs/hour (prevents overload)
✅ **AI Insights** - Automated recommendations
✅ **Dashboard** - Monitor and configure

---

## Documentation

- `MIGRATION_REQUIRED.md` - Detailed migration guide
- `AGENT_SETUP.md` - Complete feature documentation
- `supabase/migrations/20251030100000_agent_system.sql` - SQL to execute

---

## Need Help?

**Tables not found?**
- Apply the SQL migration via Supabase Dashboard

**Rate limited?**
- Wait 1 hour or increase `max_runs_per_hour` in config

**Agent fails?**
- Check Recent Runs tab for error details
- Verify AI API keys are valid

---

**Status**: Ready to use after migration ✨
