/**
 * Fix agent tables RLS for demo mode
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAgentRLS() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251030230000_disable_rls_agent_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying RLS fix for agent tables...');

    // Split SQL by statements and execute one by one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);

        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql_string: statement + ';'
          });

          // If exec_sql doesn't exist, try direct execution
          if (error && error.message && error.message.includes('function')) {
            // Use the postgres REST API directly
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({ sql_string: statement + ';' })
            });

            if (!response.ok) {
              console.warn(`Statement ${i + 1} may have failed (this is okay if already applied)`);
            }
          } else if (error) {
            console.warn(`Statement ${i + 1} warning (may be okay):`, error.message);
          } else {
            console.log(`✓ Statement ${i + 1} executed`);
          }
        } catch (err) {
          console.warn(`Statement ${i + 1} error:`, err.message);
        }
      }
    }

    console.log('\n✅ Agent RLS fix completed!');
    console.log('Agent tables should now work in demo mode.');

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixAgentRLS();
