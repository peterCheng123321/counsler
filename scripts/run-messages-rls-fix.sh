#!/bin/bash

PROJECT_REF="sxrpbbvqypzmkqjfrgev"
SQL_FILE="supabase/migrations/20241029000007_fix_messages_rls_final.sql"

echo "🚀 Opening Supabase SQL Editor for project: $PROJECT_REF"
echo "SQL Migration is ready at: $SQL_FILE"

# Open Supabase SQL Editor in browser
open "https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"

echo "Quick Link: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo ""
echo "✅ Opened SQL Editor in browser"
echo ""
echo "📋 Next steps:"
echo "1. Copy the SQL from: $SQL_FILE"
echo "2. Paste it in the SQL Editor"
echo "3. Click 'Run'"
echo ""
echo "Copying SQL to clipboard..."
cat "$SQL_FILE" | pbcopy
echo "✅ SQL copied to clipboard!"

