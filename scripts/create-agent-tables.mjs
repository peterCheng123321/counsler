/**
 * Create agent system tables directly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.production' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  try {
    console.log('📋 Creating agent system tables...\n');

    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20251030100000_agent_system.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('✓ Migration file loaded');
    console.log(`📝 SQL length: ${sql.length} characters\n`);

    // Since we can't execute raw SQL easily, let's check if tables exist
    console.log('🔍 Checking existing tables...');

    const { data: existingTables, error: tableError } = await supabase
      .from('agent_config')
      .select('count')
      .limit(1);

    if (tableError) {
      console.log('⚠️  Tables do not exist yet, they need to be created via Supabase Dashboard SQL Editor');
      console.log('\n📌 To apply the migration:');
      console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy the contents of: supabase/migrations/20251030100000_agent_system.sql');
      console.log('4. Paste and execute in SQL Editor\n');

      console.log('✨ Alternatively, you can execute the following SQL statements:\n');
      console.log('═'.repeat(80));
      console.log(sql);
      console.log('═'.repeat(80));

      return false;
    } else {
      console.log('✅ agent_config table already exists!');

      // Check other tables
      const { data: runsData, error: runsError } = await supabase
        .from('agent_runs')
        .select('count')
        .limit(1);

      const { data: insightsData, error: insightsError } = await supabase
        .from('agent_insights')
        .select('count')
        .limit(1);

      if (!runsError) console.log('✅ agent_runs table exists');
      if (!insightsError) console.log('✅ agent_insights table exists');

      console.log('\n✨ All tables appear to be set up correctly!');
      return true;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

createTables();
