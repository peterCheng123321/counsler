// Test script to directly call the route and see what happens
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

async function testDirectQuery() {
  console.log("🔍 Testing Direct Database Query (simulating API route)...\n");

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const convId = "af7efd0c-25f9-45f9-8f53-e3fc3ff3316d";
  const counselorId = "96598eda-eee2-4027-bc58-e8845fabb330";

  console.log("Step 1: Query conversation...");
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", convId)
    .eq("counselor_id", counselorId)
    .single();

  if (convError) {
    console.error("❌ Conversation query failed:", convError);
    return;
  }
  console.log("✅ Conversation found:", conversation?.title);

  console.log("\nStep 2: Query messages...");
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content, created_at, tool_calls, tool_call_id")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("❌ Messages query failed:", messagesError);
    console.error("Code:", messagesError.code);
    console.error("Message:", messagesError.message);
    console.error("Details:", messagesError.details);
    console.error("Hint:", messagesError.hint);
  } else {
    console.log(`✅ Found ${messages?.length || 0} messages`);
    if (messages && messages.length > 0) {
      messages.forEach((m, i) => {
        console.log(`  ${i + 1}. [${m.role}] ${m.content?.substring(0, 50)}...`);
      });
    }
  }

  console.log("\n✅ Direct query test completed!");
  console.log("\n💡 If this works but the API route doesn't, the issue is likely:");
  console.log("   - Authentication/session handling");
  console.log("   - RLS policies blocking authenticated requests");
  console.log("   - Route handler execution");
}

testDirectQuery().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

