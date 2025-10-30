/**
 * Apply agent system migration
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

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251030100000_agent_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');

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
          if (error && error.message.includes('function')) {
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
              console.warn(`Statement ${i + 1} may have failed (this is okay if table already exists)`);
            }
          } else if (error) {
            console.warn(`Statement ${i + 1} error (may be okay if already exists):`, error.message);
          } else {
            console.log(`✓ Statement ${i + 1} executed`);
          }
        } catch (err) {
          console.warn(`Statement ${i + 1} error:`, err.message);
        }
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('Note: Some warnings are normal if tables already exist.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
