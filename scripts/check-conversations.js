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

async function checkConversations() {
  console.log('Checking conversations table...\n');

  // Get all conversations
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (convError) {
    console.error('Error fetching conversations:', convError);
    process.exit(1);
  }

  console.log(`Found ${conversations.length} conversations:\n`);
  conversations.forEach((conv, i) => {
    console.log(`${i + 1}. ID: ${conv.id}`);
    console.log(`   Title: ${conv.title || '(no title)'}`);
    console.log(`   Counselor: ${conv.counselor_id}`);
    console.log(`   Created: ${conv.created_at}`);
    console.log(`   Updated: ${conv.updated_at}\n`);
  });

  // Check specific conversation
  const targetId = 'af7efd0c-25f9-45f9-8f53-e3fc3ff3316d';
  console.log(`\nChecking specific conversation: ${targetId}\n`);

  const { data: specific, error: specError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', targetId)
    .single();

  if (specError) {
    console.error('Error:', specError.message);
    console.error('Code:', specError.code);
  } else {
    console.log('Found conversation:', specific);

    // Get messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', targetId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
    } else {
      console.log(`\nFound ${messages.length} messages for this conversation`);
    }
  }

  process.exit(0);
}

checkConversations();
