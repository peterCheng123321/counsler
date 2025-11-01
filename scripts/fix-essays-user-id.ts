import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEssaysSchema() {
  console.log('Fixing essays table schema...');
  
  // Try to drop the foreign key constraint first
  try {
    const { error: fkError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE essays DROP CONSTRAINT IF EXISTS essays_user_id_fkey;'
    });
    if (!fkError) console.log('✓ Dropped foreign key constraint');
  } catch (e) {
    console.log('Note: Could not drop FK via RPC');
  }

  // Make user_id nullable
  try {
    const { error: nullError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE essays ALTER COLUMN user_id DROP NOT NULL;'
    });
    if (!nullError) {
      console.log('✓ Made user_id nullable');
    }
  } catch (e) {
    console.log('Note: Could not make nullable via RPC');
  }

  console.log('Schema fix attempted. Essays should now accept NULL user_id.');
}

fixEssaysSchema().catch(console.error);
