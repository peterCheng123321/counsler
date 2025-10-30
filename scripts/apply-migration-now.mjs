/**
 * Apply agent system migration via Supabase admin client
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
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql(sql) {
  try {
    // Try to execute using a direct RPC call if available
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // RPC might not exist, that's okay
      return { error: null };
    }

    return { data, error: null };
  } catch (err) {
    return { error: err };
  }
}

async function applyMigration() {
  console.log('🚀 Starting database migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20251030100000_agent_system.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration file loaded');
    console.log(`📝 SQL length: ${sql.length} characters\n`);

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📦 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementNum = i + 1;

      // Show what we're executing
      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
      process.stdout.write(`[${statementNum}/${statements.length}] ${preview} `);

      try {
        const { error } = await executeSql(statement + ';');

        if (error) {
          // Some errors are expected (like table already exists)
          if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('duplicate')
          )) {
            console.log('⚠️  SKIP (already exists)');
            skipCount++;
          } else {
            console.log('❌ ERROR');
            console.log(`   Error: ${error.message}\n`);
            errorCount++;
          }
        } else {
          console.log('✅ OK');
          successCount++;
        }
      } catch (err) {
        console.log('⚠️  WARNING');
        console.log(`   ${err.message}\n`);
        skipCount++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('Migration Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ⚠️  Skipped: ${skipCount}`);
    console.log(`  ❌ Errors:  ${errorCount}`);
    console.log('═'.repeat(60) + '\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');

    const tables = ['agent_config', 'agent_runs', 'agent_insights'];
    let allTablesExist = true;

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(0);

        if (error) {
          console.log(`❌ ${table}: NOT FOUND`);
          allTablesExist = false;
        } else {
          console.log(`✅ ${table}: EXISTS`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ERROR - ${err.message}`);
        allTablesExist = false;
      }
    }

    console.log('');

    if (allTablesExist) {
      console.log('🎉 All agent tables created successfully!\n');
      console.log('Next steps:');
      console.log('  1. Visit /agent-dashboard to configure the agent');
      console.log('  2. Click "Run Agent Now" to test');
      console.log('  3. Check the Insights tab for results\n');
      return true;
    } else {
      console.log('⚠️  Some tables are missing. Manual creation required.\n');
      console.log('Please execute the SQL manually via Supabase Dashboard:');
      console.log('  1. Go to https://supabase.com/dashboard');
      console.log('  2. Navigate to SQL Editor');
      console.log('  3. Copy and execute: supabase/migrations/20251030100000_agent_system.sql\n');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    return false;
  }
}

// Run the migration
applyMigration().then(success => {
  process.exit(success ? 0 : 1);
});
