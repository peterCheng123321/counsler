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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testSchemaFix() {
  console.log("🔍 Testing Schema Fix Results...\n");

  // Test 1: Check if chat_id is nullable
  console.log("Test 1: Checking chat_id constraint...");
  const { data: sample } = await supabase
    .from("messages")
    .select("id, chat_id, conversation_id, role")
    .limit(1);

  if (sample && sample.length > 0) {
    console.log("  Sample message structure:", sample[0]);
  }

  // Test 2: Try inserting a message without chat_id
  console.log("\nTest 2: Testing INSERT without chat_id...");
  const { data: testConv } = await supabase
    .from("conversations")
    .select("id")
    .limit(1)
    .single();

  if (testConv) {
    const { data: insertResult, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: testConv.id,
        role: "user",
        content: "Test message after migration",
      })
      .select();

    if (insertError) {
      console.error("  ❌ INSERT FAILED:", insertError.message);
      console.error("  Code:", insertError.code);
      console.error("  Details:", insertError.details);
      console.error("\n  ⚠️  Migration may not have been applied yet!");
    } else {
      console.log("  ✅ INSERT SUCCESS!");
      console.log("  Created message:", insertResult?.[0]);
      
      // Clean up test message
      if (insertResult && insertResult[0]) {
        await supabase.from("messages").delete().eq("id", insertResult[0].id);
        console.log("  🧹 Cleaned up test message");
      }
    }
  }

  // Test 3: Check conversations
  console.log("\nTest 3: Checking conversations...");
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("id, title, counselor_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (convError) {
    console.error("  ❌ Error:", convError.message);
  } else {
    console.log(`  ✅ Found ${conversations?.length || 0} conversations`);
    if (conversations && conversations.length > 0) {
      conversations.forEach((conv, i) => {
        console.log(`    ${i + 1}. ${conv.title || conv.id} (${conv.counselor_id})`);
      });
    }
  }

  // Test 4: Check messages per conversation
  console.log("\nTest 4: Checking messages per conversation...");
  if (conversations && conversations.length > 0) {
    for (const conv of conversations.slice(0, 3)) {
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("id, role, content, conversation_id, chat_id")
        .eq("conversation_id", conv.id);

      if (msgError) {
        console.error(`  ❌ Error for ${conv.id}:`, msgError.message);
      } else {
        console.log(`  Conversation ${conv.title || conv.id}: ${messages?.length || 0} messages`);
        if (messages && messages.length > 0) {
          messages.forEach((m) => {
            console.log(`    - [${m.role}] ${m.content?.substring(0, 40) || "(empty)"}...`);
          });
        }
      }
    }
  }

  // Test 5: Test RLS with anon key
  console.log("\nTest 5: Testing RLS with anon key...");
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
      console.error("  ❌ RLS blocking:", anonError.message);
      console.error("  ⚠️  RLS policies require authenticated user");
    } else {
      console.log(`  ✅ Anon key can access ${anonConversations?.length || 0} conversations`);
      console.log("  ⚠️  This suggests RLS might not be working correctly");
    }
  }

  console.log("\n✅ Schema check completed!");
}

testSchemaFix().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

