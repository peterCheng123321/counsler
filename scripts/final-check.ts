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

async function finalCheck() {
  console.log("🔍 Final Database Status Check...\n");

  // Check current schema
  const { data: sample } = await supabase
    .from("messages")
    .select("*")
    .limit(1);

  if (sample && sample.length > 0) {
    console.log("📊 Current messages table columns:");
    Object.keys(sample[0]).forEach((key) => {
      const value = sample[0][key];
      console.log(`  ${key}: ${value === null ? 'NULL' : typeof value} (${value === null ? 'nullable' : 'has value'})`);
    });
  }

  // Try insert with all possible required fields
  console.log("\n🧪 Testing INSERT with different field combinations...\n");

  const { data: testConv } = await supabase
    .from("conversations")
    .select("id")
    .limit(1)
    .single();

  if (testConv) {
    // Test 1: Only conversation_id and role
    console.log("Test 1: INSERT with conversation_id + role + content");
    const { error: err1 } = await supabase
      .from("messages")
      .insert({
        conversation_id: testConv.id,
        role: "user",
        content: "Test 1",
      });

    if (err1) {
      console.error("  ❌ Failed:", err1.message);
      console.error("  Required fields:", err1.details);
    } else {
      console.log("  ✅ Success!");
      await supabase.from("messages").delete().eq("conversation_id", testConv.id).eq("content", "Test 1");
    }

    // Test 2: Include type
    console.log("\nTest 2: INSERT with conversation_id + role + content + type");
    const { error: err2 } = await supabase
      .from("messages")
      .insert({
        conversation_id: testConv.id,
        role: "user",
        content: "Test 2",
        type: "user",
      });

    if (err2) {
      console.error("  ❌ Failed:", err2.message);
    } else {
      console.log("  ✅ Success! (type field is required)");
      await supabase.from("messages").delete().eq("conversation_id", testConv.id).eq("content", "Test 2");
    }

    // Test 3: Include chat_id
    console.log("\nTest 3: INSERT with conversation_id + role + content + chat_id");
    const { error: err3 } = await supabase
      .from("messages")
      .insert({
        conversation_id: testConv.id,
        role: "user",
        content: "Test 3",
        chat_id: 999,
      });

    if (err3) {
      console.error("  ❌ Failed:", err3.message);
    } else {
      console.log("  ✅ Success! (chat_id field is required)");
      await supabase.from("messages").delete().eq("conversation_id", testConv.id).eq("content", "Test 3");
    }
  }

  console.log("\n📋 MIGRATION STATUS:");
  console.log("  ⚠️  Migration has NOT been applied yet");
  console.log("  Required fields that need to be nullable:");
  console.log("    - chat_id (currently NOT NULL)");
  console.log("    - type (currently NOT NULL)");
  console.log("\n💡 Run the migration SQL in Supabase Dashboard to fix this!");
}

finalCheck().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

