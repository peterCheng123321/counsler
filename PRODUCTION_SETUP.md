# Production Setup Guide

## Current Errors and How to Fix Them

### 1. ✅ Agent Run API 500 Error
**Error**: `/api/cron/agent-run` returns 500 status

**Cause**: Agent database tables don't exist in production Supabase yet

**Fix**:
1. Open your **Production** Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy and paste ALL SQL from `FIX_AGENT_DASHBOARD.md` (lines 22-180)
5. Click **Run**
6. Go to **Settings** → **API** → Click **"Reload schema"** button
7. Wait 30 seconds
8. Refresh your deployed app

This will create 7 tables:
- `agent_config`
- `agent_runs`
- `agent_insights`
- `agent_checkpoints` (persistent memory)
- `workflows`
- `workflow_runs`
- `workflow_step_logs`

---

### 2. ✅ React Hydration Error (#418)
**Error**: `Minified React error #418` - HTML hydration mismatch

**Cause**: Agent dashboard conditionally renders different UI based on whether tables exist, causing server/client mismatch

**Fix**: Run the SQL migration above. Once tables exist, the error disappears because the same UI renders on both server and client.

**Temporary Workaround**: Don't visit `/agent-dashboard` until tables are created

---

### 3. ✅ Missing Favicon (404)
**Error**: `favicon.ico:1 Failed to load resource: 404`

**Cause**: No favicon file in `/public` directory

**Fix**: Optional - add a favicon to `/public/favicon.ico`

This is cosmetic only and doesn't affect functionality.

---

## Step-by-Step Production Deployment

### Prerequisites
- Vercel deployment (already done ✅)
- Production Supabase project
- Environment variables configured in Vercel

### 1. Configure Production Environment Variables

In **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**:

```bash
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# AI Services (same as dev)
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...

# LangSmith (optional - for production monitoring)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=consuler-prod
```

### 2. Create Database Tables (CRITICAL)

**In Production Supabase**:

1. Open SQL Editor
2. Run ALL SQL from `FIX_AGENT_DASHBOARD.md`
3. **MUST reload schema cache** (Settings → API → Reload schema)
4. Verify tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND (table_name LIKE 'agent_%' OR table_name LIKE 'workflow%')
   ORDER BY table_name;
   ```

Should show 7 tables.

### 3. Test Production Deployment

Visit your deployed URL and test:

- ✅ `/` - Homepage loads
- ✅ `/students` - Students page works
- ✅ `/tasks` - Tasks page works
- ✅ `/chatbot` - Chatbot responds (may take 30s on first request - cold start)
- ✅ `/agent-dashboard` - Shows dashboard (after SQL migration)

### 4. Initial Data Setup (Optional)

You can bulk upload students using:
- Manual CSV upload at `/students`
- AI-powered image upload (photo of roster)

---

## Common Production Issues

### Issue: "Chatbot takes 30+ seconds to respond"
**Cause**: Vercel serverless functions cold start + LangChain initialization

**Solutions**:
1. Use Vercel Pro plan (keeps functions warm)
2. Upgrade to dedicated compute
3. Accept 20-30s first response (subsequent responses are fast)

### Issue: "Agent dashboard still shows setup screen after running SQL"
**Cause**: Schema cache not reloaded

**Fix**:
1. Supabase Dashboard → Settings → API → Click "Reload schema"
2. Wait 30 seconds
3. Hard refresh browser (Cmd/Ctrl + Shift + R)

### Issue: "Workflows fail to execute"
**Cause**: Workflow tables don't exist

**Fix**: Run the SQL migration from `FIX_AGENT_DASHBOARD.md` (includes workflow tables)

### Issue: "Agent doesn't remember conversations"
**Cause**: agent_checkpoints table doesn't exist

**Fix**: Run the SQL migration (includes agent_checkpoints table)

---

## Performance Optimization

### 1. Database Indexes
All necessary indexes are created by the migration. No additional setup needed.

### 2. Caching
- Response cache enabled (5min TTL)
- Request queue limits concurrent AI requests (max 3)

### 3. Rate Limiting
- Agent runs limited to 5 per hour per counselor
- Configurable in `agent_config` table

---

## Monitoring & Observability

### LangSmith (Recommended for Production)

1. Sign up at https://smith.langchain.com/
2. Create production project: "consuler-prod"
3. Get API key
4. Add to Vercel environment variables:
   ```bash
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your_key
   LANGCHAIN_PROJECT=consuler-prod
   ```
5. Redeploy on Vercel

Benefits:
- View all agent conversations
- Debug errors in real-time
- Track token usage and costs
- Monitor tool execution

### Vercel Analytics
Already enabled automatically on Vercel Pro.

---

## Security Checklist

- [x] RLS disabled for demo mode (intentional)
- [x] Admin client used for all database operations
- [x] Environment variables not exposed to client
- [x] API routes protected by server-side auth
- [x] Rate limiting on agent execution

**Note**: This is a demo app with a fixed demo user. For production with real users, implement proper authentication and enable RLS.

---

## Costs Estimate (Monthly)

**Vercel**:
- Hobby: Free
- Pro: $20/month (recommended for better performance)

**Supabase**:
- Free tier: $0 (sufficient for demo/dev)
- Pro: $25/month (for production)

**AI Services**:
- Azure OpenAI: ~$0.002 per request (gpt-4)
- OpenAI: ~$0.001 per request (gpt-4o-mini)
- Gemini: Free tier available

**LangSmith** (optional):
- Free: 5,000 traces/month
- Plus: $39/month (50,000 traces)

---

## Support & Troubleshooting

If you encounter issues:

1. Check Vercel deployment logs
2. Check Supabase logs (Logs → Postgres Logs)
3. Verify all environment variables are set
4. Ensure SQL migration was run successfully
5. Confirm schema cache was reloaded

All Phase 3 features require the database migration to be run in production.

---

## Next Steps

Once production is set up:

1. Test all features work
2. Upload initial student data
3. Configure agent schedules (if desired)
4. Set up LangSmith monitoring
5. Consider upgrading to Vercel Pro for better performance
