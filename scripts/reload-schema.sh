#!/bin/bash

# Reload Supabase Schema Cache
# This script helps reload the schema cache after creating new tables

PROJECT_ID="sxrpbbvqypzmkqjfrgev"
SUPABASE_URL="https://${PROJECT_ID}.supabase.co"

echo "🔄 Supabase Schema Cache Reload"
echo "================================"
echo ""

# Step 1: Verify tables exist
echo "📋 Step 1: Verifying tables exist..."
echo ""
echo "Run this query in Supabase SQL Editor:"
echo "SELECT table_name FROM information_schema.tables"
echo "WHERE table_schema = 'public' AND table_name LIKE 'agent_%';"
echo ""

# Step 2: Instructions for manual reload
echo "🔧 Step 2: Reload Schema Cache (Manual)"
echo ""
echo "1. Open Supabase Dashboard:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2. Select your project:"
echo "   ${PROJECT_ID}"
echo ""
echo "3. Navigate to Settings:"
echo "   Click the gear icon (⚙️) in the left sidebar"
echo ""
echo "4. Click API section"
echo ""
echo "5. Find the Schema section and click 'Reload schema'"
echo ""
echo "6. Wait for confirmation (usually 10-30 seconds)"
echo ""

# Step 3: Verify the API works
echo "✅ Step 3: Verify API Works"
echo ""
echo "After reloading, test the API:"
echo ""
echo "curl http://localhost:3000/api/v1/agent/config"
echo ""
echo "Should return a JSON response (not 500 error)"
echo ""

# Step 4: Refresh dashboard
echo "🎉 Step 4: Refresh Agent Dashboard"
echo ""
echo "Go to: http://localhost:3000/agent-dashboard"
echo ""
echo "The page should now load without errors!"
echo ""

echo "================================"
echo "✅ Schema reload instructions complete"
echo ""
