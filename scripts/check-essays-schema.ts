import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('essays')
    .select()
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Essays table columns:', Object.keys(data?.[0] || {}));
  }
}

checkSchema().catch(console.error);
