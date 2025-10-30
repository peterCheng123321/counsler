# Agent System Setup Guide

This document explains how to set up the autonomous AI agent system with LangGraph.

## Overview

The agent system consists of:
- **LangGraph Agent**: Autonomous AI agent with analytics tools
- **Background Scheduler**: Automated runs with rate limiting
- **Agent Dashboard**: Monitor and configure the agent
- **Insights System**: AI-generated recommendations

## Features

✅ **Autonomous Analytics**: Calculate statistics, analyze trends, monitor deadlines
✅ **Rate Limiting**: Prevents backend overload (max 5 runs/hour default)
✅ **Background Execution**: Scheduled runs for daily digest, deadline monitoring, risk assessment
✅ **Insights Dashboard**: View AI-generated insights and recommendations
✅ **Configurable**: Adjust intervals, enable/disable features, set limits

## Database Setup (REQUIRED)

The agent system requires three new database tables. Follow these steps to create them:

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `sxrpbbvqypzmkqjfrgev`
3. Navigate to **SQL Editor** in the left sidebar
4. Create a new query
5. Copy the entire contents of: `supabase/migrations/20251030100000_agent_system.sql`
6. Paste into the SQL Editor
7. Click **Run** to execute

### Option 2: Setup API Endpoint

1. Start your dev server: `npm run dev`
2. Call the setup endpoint:
```bash
curl -X POST http://localhost:3000/api/setup/agent-tables
```
3. Check the response for status

### Tables Created

- **agent_config**: Agent configuration with rate limiting settings
- **agent_runs**: Execution history and performance metrics
- **agent_insights**: AI-generated insights with auto-expiration

### Verification

Run this script to verify tables were created:
```bash
node scripts/create-agent-tables.mjs
```

You should see:
```
✅ agent_config table exists
✅ agent_runs table exists
✅ agent_insights table exists
```

## Usage

### 1. Chat Integration

The agent is automatically enabled in the chatbot. To use analytics features:

```
User: "How many students are graduating in 2025?"
Agent: [Uses calculate_statistics tool to query database]

User: "Show me task completion trends over the last 30 days"
Agent: [Uses trend_analysis tool to analyze patterns]
```

### 2. Background Agent

#### Manual Run

Visit the Agent Dashboard at `/agent-dashboard` and click "Run Agent Now"

Or use the API:
```bash
curl -X POST http://localhost:3000/api/cron/agent-run \
  -H "Content-Type: application/json" \
  -d '{"runType": "manual"}'
```

#### Scheduled Runs

Configure automated runs in the Agent Dashboard:

- **Daily Digest**: Summary of student progress (default: 8:00 AM)
- **Deadline Monitor**: Check upcoming deadlines (default: every 6 hours)
- **Risk Assessment**: Identify at-risk students (default: every 24 hours)

#### Cron Setup (Production)

Add to your cron service (Vercel Cron, GitHub Actions, etc.):

```yaml
# .github/workflows/agent-cron.yml
name: Agent Scheduled Runs
on:
  schedule:
    - cron: '0 8 * * *'  # Daily digest at 8 AM
    - cron: '0 */6 * * *'  # Deadline monitor every 6 hours
    - cron: '0 0 * * *'  # Risk assessment daily at midnight

jobs:
  run-agent:
    runs-on: ubuntu-latest
    steps:
      - name: Daily Digest
        run: |
          curl -X POST ${{ secrets.SITE_URL }}/api/cron/agent-run \
            -H "Content-Type: application/json" \
            -d '{"runType": "daily_digest"}'
```

### 3. Agent Dashboard

Access at: `/agent-dashboard`

Features:
- **Stats Overview**: Runs (24h), active insights, success rate, avg execution time
- **Insights Tab**: View and manage AI-generated insights
  - Mark as "Acted On" or "Dismiss"
  - Filter by priority (high/medium/low) and category
- **Recent Runs Tab**: Execution history with metrics
  - View status (completed/failed/running)
  - See insights generated and tools used
  - Check execution time
- **Configuration Tab**: Adjust agent settings
  - Enable/disable features
  - Set run intervals (min 6-24 hours)
  - Configure rate limits (1-10 runs/hour)
  - Adjust insight limits (1-20 per run)
  - Toggle autonomous actions

## Rate Limiting & Backend Protection

The system includes multiple safeguards to prevent backend overload:

### 1. Run Frequency Limits
- **Max Runs Per Hour**: 5 (configurable, max 10)
- **Deadline Monitor Interval**: Min 6 hours
- **Risk Assessment Interval**: Min 12 hours
- **Daily Digest**: Once per day

### 2. Duplicate Prevention
- Checks for already-running jobs
- Blocks new runs of same type until previous completes

### 3. Insight Limits
- **Max Insights Per Run**: 10 (configurable, max 20)
- **Auto-Expiration**: Insights expire after 7 days
- **Cleanup Function**: Removes dismissed insights after 30 days

### 4. Database Optimization
- Efficient indexes on all query patterns
- JSONB storage for variable-length data
- Row Level Security (RLS) for isolation

### 5. Execution Monitoring
- Tracks execution time for each run
- Logs tool usage and error messages
- Success/failure tracking

## API Endpoints

### Agent Configuration
```
GET  /api/v1/agent/config         # Get current configuration
PUT  /api/v1/agent/config         # Update configuration
```

### Agent Execution
```
POST /api/cron/agent-run          # Run background agent
GET  /api/cron/agent-run          # Get status and recent runs
```

### Agent Insights
```
GET    /api/v1/agent/insights     # Get active insights
PATCH  /api/v1/agent/insights     # Update insight status
DELETE /api/v1/agent/insights?id= # Delete an insight
```

## Analytics Tools Available

The agent has access to these analytics tools:

### 1. Calculate Statistics
Compute aggregations across students or tasks:
- Count, average, median, min, max
- Distribution analysis
- Completion rate tracking
- Flexible filtering by year, status, priority, progress

### 2. Trend Analysis
Analyze patterns over time:
- Time periods: 7d, 30d, 90d, 1y
- Track task completion trends
- Monitor student progress changes
- Identify seasonal patterns

### 3. Generate Insights
AI-powered insight extraction:
- Analyzes data and identifies patterns
- Generates actionable recommendations
- Categorizes by priority (high/medium/low)
- Includes specific findings and suggestions

### 4. Deadline Monitor
Proactive deadline tracking:
- Identifies upcoming deadlines
- Flags critical and overdue items
- Assesses workload conflicts
- Recommends prioritization

## Configuration Options

Edit via the Agent Dashboard `/agent-dashboard` or API:

```typescript
{
  // Feature toggles
  daily_digest_enabled: boolean,
  deadline_monitor_enabled: boolean,
  risk_assessment_enabled: boolean,
  autonomous_actions_enabled: boolean,  // Experimental

  // Scheduling
  daily_digest_time: "08:00:00",        // HH:MM:SS
  deadline_monitor_interval_hours: 6,   // Min 6, max 24
  risk_assessment_interval_hours: 24,   // Min 12, max 168

  // Rate limiting (prevents overload)
  max_runs_per_hour: 5,                 // Min 1, max 10
  max_insights_per_run: 10,             // Min 1, max 20

  // Notifications
  notification_preferences: {
    email: false,
    in_app: true
  }
}
```

## Troubleshooting

### Tables don't exist
Run the migration SQL via Supabase Dashboard SQL Editor

### Rate limit exceeded
Wait for the hourly window to reset, or increase `max_runs_per_hour` in config (max 10)

### Agent runs fail
Check the error message in the Recent Runs tab. Common issues:
- Invalid AI API keys
- Database connection issues
- Tool execution errors

### No insights generated
- Check that the query is appropriate for analytics
- Verify students and tasks exist in the database
- Review tool execution logs in agent runs

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
├─────────────────────────────────────────────────────────┤
│  Chatbot               Agent Dashboard                   │
│  - Streaming chat      - Stats overview                  │
│  - Real-time insights  - Insights feed                   │
│  - Tool execution      - Configuration UI                │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                     API Layer                            │
├─────────────────────────────────────────────────────────┤
│  /api/v1/chatbot/chat                                    │
│  /api/cron/agent-run                                     │
│  /api/v1/agent/config                                    │
│  /api/v1/agent/insights                                  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  LangGraph Agent                         │
├─────────────────────────────────────────────────────────┤
│  createReactAgent()                                      │
│  - LLM: Azure/OpenAI/Gemini                             │
│  - Memory: MemorySaver                                   │
│  - Tools: CRUD + Analytics                               │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  Analytics Tools                         │
├─────────────────────────────────────────────────────────┤
│  - calculate_statistics                                  │
│  - trend_analysis                                        │
│  - generate_insights                                     │
│  - deadline_monitor                                      │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  Rate Limiter                            │
├─────────────────────────────────────────────────────────┤
│  lib/ai/agent-scheduler.ts                              │
│  - canRunAgent()                                         │
│  - Interval enforcement                                  │
│  - Duplicate prevention                                  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   Database                               │
├─────────────────────────────────────────────────────────┤
│  agent_config    - Configuration & limits                │
│  agent_runs      - Execution history                     │
│  agent_insights  - AI-generated insights                 │
│  + Indexes, RLS, Auto-cleanup                           │
└─────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **RLS Enabled**: All agent tables use Row Level Security
2. **Admin Client**: Background jobs use service role for system operations
3. **Rate Limiting**: Prevents abuse and overload
4. **Input Validation**: Zod schemas validate all API inputs
5. **Autonomous Actions Disabled**: By default, agent only provides insights

## Performance Optimization

1. **Database Indexes**: Optimized for common query patterns
2. **JSONB Storage**: Efficient variable-length data
3. **Insight Expiration**: Auto-cleanup prevents bloat
4. **Execution Tracking**: Monitor and optimize slow runs
5. **Tool Result Caching**: Memory saver stores conversation state

## Next Steps

1. ✅ Apply database migration
2. ✅ Test manual agent run via dashboard
3. ✅ Verify insights generation
4. ✅ Configure scheduled runs for production
5. ✅ Set up monitoring/alerting for failed runs
6. ✅ Customize agent prompts and tool descriptions
7. ✅ Add new analytics tools as needed

## Support

For issues or questions:
- Check the Recent Runs tab in Agent Dashboard for error messages
- Review execution logs in console
- Verify database tables exist and are accessible
- Ensure AI API keys are valid and have quota

---

**Built with**: LangGraph, LangChain, Supabase, Next.js, TypeScript
