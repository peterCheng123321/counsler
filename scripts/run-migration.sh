#!/bin/bash

# Execute migration using Supabase CLI or API

cd /Users/peter/Downloads/consuler

# Load env vars
source <(grep -E "^[A-Z_]+=.*" .env.local)

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Missing Supabase credentials"
  exit 1
fi

# Extract project ref
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*||')

echo "🚀 Executing migration for project: $PROJECT_REF"
echo ""

# Read migration SQL
SQL_FILE="supabase/migrations/20241029000005_fix_schema_mismatch.sql"
SQL=$(cat "$SQL_FILE")

# Execute via Supabase Management API
echo "📤 Sending migration to Supabase..."

# Try using Supabase CLI db execute
if command -v supabase &> /dev/null; then
  echo "Using Supabase CLI..."
  
  # Check if linked
  if [ -f ".supabase/config.toml" ]; then
    echo "Project is linked, executing migration..."
    supabase db execute -f "$SQL_FILE" 2>&1
  else
    echo "Project not linked. Trying direct API call..."
    
    # Use Management API to execute SQL
    RESPONSE=$(curl -s -X POST \
      "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"$SQL\"}" 2>&1)
    
    echo "$RESPONSE"
  fi
else
  echo "Supabase CLI not found. Using direct API..."
  
  # Escape SQL for JSON
  ESCAPED_SQL=$(echo "$SQL" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  
  # Call Supabase Management API
  curl -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$ESCAPED_SQL\"}" \
    -w "\n\nHTTP Status: %{http_code}\n"
fi

echo ""
echo "✅ Migration execution completed!"

