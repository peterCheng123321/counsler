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

async function checkRLS() {
  console.log("🔒 Checking RLS Policies and Data...\n");

  // Get the counselor ID from conversations
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, counselor_id")
    .limit(1);

  if (!conversations || conversations.length === 0) {
    console.log("No conversations found");
    return;
  }

  const counselorId = conversations[0].counselor_id;
  console.log(`📌 Found counselor_id: ${counselorId}\n`);

  // Check if there's a user with this ID
  const { data: user, error: userError } = await supabase.auth.admin.getUserById(counselorId);
  
  if (userError) {
    console.error("❌ Error fetching user:", userError);
  } else if (user?.user) {
    console.log(`✅ User exists: ${user.user.email || user.user.id}`);
  } else {
    console.log("⚠️  User not found with this ID");
  }

  console.log("\n📊 RLS Policy Check:");
  console.log("The RLS policy requires:");
  console.log("  1. auth.uid() must match counselor_id");
  console.log("  2. For messages: conversation must exist and belong to counselor");
  console.log("\n⚠️  If auth.uid() is null in API routes, RLS will block all queries!");

  // Check message insert policy
  console.log("\n💡 Issue Found:");
  console.log("When inserting messages:");
  console.log("  - The conversation must exist FIRST");
  console.log("  - The conversation.counselor_id must match auth.uid()");
  console.log("  - If auth.uid() is null/undefined, INSERT will fail");
  
  // Test inserting a message with service role (should work)
  console.log("\n🧪 Testing message insert with service role...");
  const testConvId = conversations[0].id;
  
  const { data: insertResult, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: testConvId,
      role: "user",
      content: "Test message from script",
    })
    .select();

  if (insertError) {
    console.error("❌ Insert failed:", insertError);
  } else {
    console.log("✅ Insert succeeded with service role");
    // Clean up
    if (insertResult && insertResult[0]) {
      await supabase.from("messages").delete().eq("id", insertResult[0].id);
    }
  }
}

checkRLS().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

