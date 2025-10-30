import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = path.join(process.cwd(), ".env.local");
const env: Record<string, string> = {};

if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function debugMessages() {
  console.log("🔍 Debugging Messages Table...\n");

  // Get ALL messages
  const { data: allMessages, error: allError } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (allError) {
    console.error("❌ Error fetching all messages:", allError);
    return;
  }

  console.log(`📊 Total messages in database: ${allMessages?.length || 0}\n`);

  if (allMessages && allMessages.length > 0) {
    allMessages.forEach((msg, i) => {
      console.log(`Message ${i + 1}:`);
      console.log(`  ID: ${msg.id}`);
      console.log(`  Conversation ID: ${msg.conversation_id}`);
      console.log(`  Role: ${msg.role}`);
      console.log(`  Content: ${msg.content?.substring(0, 100) || "(empty)"}`);
      console.log(`  Created: ${msg.created_at}`);
      console.log(`  Tool Calls: ${msg.tool_calls ? "Yes" : "No"}`);
      console.log("");
    });
  }

  // Get conversations
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, counselor_id")
    .order("updated_at", { ascending: false });

  console.log(`📊 Total conversations: ${conversations?.length || 0}\n`);

  // Check messages for each conversation
  if (conversations && conversations.length > 0) {
    for (const conv of conversations) {
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conv.id);

      if (msgError) {
        console.error(`❌ Error fetching messages for ${conv.id}:`, msgError);
      } else {
        console.log(`Conversation: ${conv.title || conv.id}`);
        console.log(`  Messages: ${messages?.length || 0}`);
        if (messages && messages.length > 0) {
          messages.forEach((m) => {
            console.log(`    - [${m.role}] ${m.content.substring(0, 50)}...`);
          });
        }
        console.log("");
      }
    }
  }

  // Test RLS with anon key
  console.log("🔒 Testing RLS with Anon Key...");
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: anonConversations, error: anonError } = await anonClient
      .from("conversations")
      .select("id, title")
      .limit(5);

    if (anonError) {
      console.error("❌ RLS blocking access with anon key:", anonError);
    } else {
      console.log(`✅ Anon key can access ${anonConversations?.length || 0} conversations`);
    }
  }
}

debugMessages().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

