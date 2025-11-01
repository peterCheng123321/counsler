import { createClient } from '@supabase/supabase-js';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteStudents() {
  console.log('🗑️  Deleting all students...');
  
  const { error: deleteError } = await supabase
    .from('students')
    .delete()
    .eq('counselor_id', DEMO_USER_ID);

  if (deleteError) {
    console.error('❌ Error deleting students:', deleteError);
    return;
  }

  console.log('✅ All students deleted');
}

deleteStudents().catch(console.error);
