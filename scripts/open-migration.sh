#!/bin/bash

# Open Supabase SQL Editor with migration ready to paste

cd /Users/peter/Downloads/consuler

# Extract project ref
PROJECT_REF=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d'=' -f2 | sed 's|https://||' | sed 's|\.supabase\.co.*||')

echo "🚀 Opening Supabase SQL Editor for project: $PROJECT_REF"
echo ""
echo "SQL Migration is ready at: supabase/migrations/20241029000005_fix_schema_mismatch.sql"
echo ""
echo "Quick Link: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo ""

# Try to open in browser
if command -v open &> /dev/null; then
  open "https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
  echo "✅ Opened SQL Editor in browser"
  echo ""
  echo "📋 Next steps:"
  echo "1. Copy the SQL from: supabase/migrations/20241029000005_fix_schema_mismatch.sql"
  echo "2. Paste it in the SQL Editor"
  echo "3. Click 'Run'"
  echo ""
  echo "Or run: cat supabase/migrations/20241029000005_fix_schema_mismatch.sql | pbcopy"
  echo "to copy the SQL to clipboard"
else
  echo "Please open: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
fi

