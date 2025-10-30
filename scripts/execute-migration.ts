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

async function executeMigration() {
  console.log("🚀 Executing Schema Fix Migration...\n");

  // Step 1: Make chat_id nullable by updating existing records first
  console.log("Step 1: Checking chat_id constraint...");
  const { data: nonNullChatIds } = await supabase
    .from("messages")
    .select("id, chat_id")
    .not("chat_id", "is", null)
    .limit(1);

  console.log("  ℹ️  Cannot remove NOT NULL constraint via JS client");
  console.log("  ⚠️  This requires direct SQL: ALTER TABLE messages ALTER COLUMN chat_id DROP NOT NULL;\n");

  // Step 2: Migrate conversation_id
  console.log("Step 2: Migrating conversation_id...");
  const { data: messagesToMigrate } = await supabase
    .from("messages")
    .select("id, chat_id, conversation_id")
    .is("conversation_id", null)
    .not("chat_id", "is", null);

  if (messagesToMigrate && messagesToMigrate.length > 0) {
    console.log(`  Found ${messagesToMigrate.length} messages with chat_id but no conversation_id`);
    console.log("  ⚠️  Cannot map chat_id (int) to conversation_id (uuid) automatically");
    console.log("  ℹ️  These messages will be handled separately\n");
  } else {
    console.log("  ✅ No messages need conversation_id migration\n");
  }

  // Step 3: Migrate role from type
  console.log("Step 3: Migrating role from type...");
  const { data: allMessages } = await supabase
    .from("messages")
    .select("id, type, role");

  if (allMessages && allMessages.length > 0) {
    let updated = 0;
    for (const msg of allMessages) {
      if (!msg.role && msg.type) {
        const role = msg.type === 'bot' ? 'assistant' : msg.type === 'user' ? 'user' : 'assistant';
        const { error } = await supabase
          .from("messages")
          .update({ role })
          .eq("id", msg.id);
        
        if (!error) {
          updated++;
        }
      }
    }
    console.log(`  ✅ Updated ${updated} messages: type -> role\n`);
  }

  // Step 5: Clean up orphaned messages
  console.log("Step 5: Cleaning up orphaned messages...");
  const { error: deleteError, count } = await supabase
    .from("messages")
    .delete()
    .is("conversation_id", null)
    .is("chat_id", null);

  if (deleteError) {
    console.error("  ❌ Error:", deleteError.message);
  } else {
    console.log("  ✅ Cleaned up orphaned messages\n");
  }

  // Now try to fix the main issue: make chat_id optional for inserts
  console.log("🔧 Attempting to insert a test message without chat_id...");
  const { data: testConv } = await supabase
    .from("conversations")
    .select("id")
    .limit(1)
    .single();

  if (testConv) {
    const { error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: testConv.id,
        role: "user",
        content: "Test message",
      })
      .select();

    if (insertError) {
      console.error("  ❌ Still failing:", insertError.message);
      console.error("  💡 You MUST run this SQL in Supabase SQL Editor:");
      console.error("     ALTER TABLE messages ALTER COLUMN chat_id DROP NOT NULL;");
    } else {
      console.log("  ✅ Success! Schema fix worked");
      // Clean up test message
      await supabase.from("messages").delete().eq("conversation_id", testConv.id).eq("content", "Test message");
    }
  }

  console.log("\n⚠️  CRITICAL: You MUST run this SQL manually in Supabase Dashboard:");
  console.log("   Go to: SQL Editor > New Query");
  console.log("   Run: supabase/migrations/20241029000005_fix_schema_mismatch.sql");
  console.log("\n   Or run this single command:");
  console.log("   ALTER TABLE messages ALTER COLUMN chat_id DROP NOT NULL;");
}

executeMigration().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

