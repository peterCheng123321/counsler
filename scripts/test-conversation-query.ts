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

async function testConversationQuery() {
  console.log("🔍 Testing conversation query with different select statements...\n");

  const convId = "af7efd0c-25f9-45f9-8f53-e3fc3ff3316d";

  // Test 1: Select all columns
  console.log("Test 1: SELECT * from conversations");
  const { data: conv1, error: err1 } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", convId)
    .single();

  if (err1) {
    console.error("  ❌ Error:", err1.message);
    console.error("  Code:", err1.code);
    console.error("  Details:", err1.details);
  } else {
    console.log("  ✅ Success:", conv1);
  }

  // Test 2: Select specific columns
  console.log("\nTest 2: SELECT id, title, updated_at from conversations");
  const { data: conv2, error: err2 } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("id", convId)
    .single();

  if (err2) {
    console.error("  ❌ Error:", err2.message);
  } else {
    console.log("  ✅ Success:", conv2);
  }

  // Test 3: Select messages
  console.log("\nTest 3: SELECT id, role, content, created_at from messages");
  const { data: msgs, error: err3 } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  if (err3) {
    console.error("  ❌ Error:", err3.message);
    console.error("  Code:", err3.code);
    console.error("  Details:", err3.details);
    console.error("  Hint:", err3.hint);
  } else {
    console.log(`  ✅ Success: Found ${msgs?.length || 0} messages`);
  }

  // Test 4: Try selecting all columns from messages
  console.log("\nTest 4: SELECT * from messages");
  const { data: msgsAll, error: err4 } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .limit(5);

  if (err4) {
    console.error("  ❌ Error:", err4.message);
    console.error("  Code:", err4.code);
  } else {
    console.log(`  ✅ Success: Found ${msgsAll?.length || 0} messages`);
    if (msgsAll && msgsAll.length > 0) {
      console.log("  Sample:", msgsAll[0]);
    }
  }
}

testConversationQuery().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

