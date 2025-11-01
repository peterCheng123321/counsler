import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  const sql = fs.readFileSync('supabase/migrations/20251031020000_make_essays_user_id_nullable.sql', 'utf-8');
  
  const { error } = await supabase.rpc('exec', { sql });
  
  if (error) {
    console.error('Error applying migration:', error);
  } else {
    console.log('✅ Migration applied successfully');
  }
}

applyMigration().catch(console.error);
