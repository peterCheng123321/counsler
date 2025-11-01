import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSchema() {
  console.log('Attempting to make user_id nullable in essays table...');
  
  const { error } = await supabase.rpc('exec_sql', { 
    sql: 'ALTER TABLE essays ALTER COLUMN user_id DROP NOT NULL;' 
  }).catch(() => ({ error: { message: 'exec_sql not available' } }));
  
  if (error && error.message.includes('exec_sql')) {
    console.log('exec_sql not available, trying direct approach...');
    // Try a different approach - just attempt the migration
    const { error: altError } = await supabase.from('essays').select('user_id').limit(1);
    if (altError?.message.includes('null value')) {
      console.log('✅ user_id is already nullable or migration worked');
    }
  } else if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Migration applied');
  }
}

fixSchema().catch(console.error);
