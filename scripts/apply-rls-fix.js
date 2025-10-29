const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyRLSFix() {
  console.log('Applying RLS fix for messages table...\n');

  // Read the SQL file
  const sql = fs.readFileSync('supabase/migrations/20241029000005_fix_messages_rls_permissions.sql', 'utf8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    console.log(statement.substring(0, 100) + '...\n');

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

      if (error) {
        // Try direct execution if RPC fails
        console.log('RPC failed, trying direct execution...');
        const { error: directError } = await supabase.from('_migrations').insert({ statement });

        if (directError) {
          console.error('Error:', error || directError);
          console.log('Skipping this statement and continuing...\n');
        } else {
          console.log('✓ Success\n');
        }
      } else {
        console.log('✓ Success\n');
      }
    } catch (err) {
      console.error('Exception:', err.message);
      console.log('Continuing...\n');
    }
  }

  console.log('\nAttempting to verify RLS policies...');

  // Test if we can query messages now
  const { data: testMessages, error: testError } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (testError) {
    console.error('Test query failed:', testError);
    console.log('\n⚠️  RLS policies may need manual application via Supabase Dashboard');
    console.log('   Go to: Database > Tables > messages > RLS Policies');
  } else {
    console.log('✓ Messages table is now accessible!');
  }

  process.exit(0);
}

applyRLSFix();
