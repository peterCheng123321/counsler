import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load env vars
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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

console.log("🔍 Testing Database Connection...\n");
console.log("Supabase URL:", supabaseUrl);
console.log("Using:", supabaseServiceKey ? "Service Role Key" : "Anon Key");
console.log("");

// Create client with service role for admin access
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function testConnection() {
  try {
    // Test 1: Check if tables exist
    console.log("📊 Test 1: Checking tables...");
    const { data: tables, error: tablesError } = await supabase
      .from("conversations")
      .select("count")
      .limit(1);

    if (tablesError && tablesError.code === "PGRST116") {
      console.error("❌ Table 'conversations' does not exist!");
      console.error("Error:", tablesError.message);
      return;
    }
    console.log("✅ Conversations table exists\n");

    // Test 2: Count conversations
    console.log("📊 Test 2: Counting conversations...");
    const { count: convCount, error: convCountError } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true });

    if (convCountError) {
      console.error("❌ Error counting conversations:", convCountError);
    } else {
      console.log(`✅ Found ${convCount || 0} conversations\n`);
    }

    // Test 3: Get all conversations
    console.log("📊 Test 3: Fetching conversations...");
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, title, counselor_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (convError) {
      console.error("❌ Error fetching conversations:", convError);
      console.error("Code:", convError.code);
      console.error("Message:", convError.message);
      console.error("Details:", convError.details);
      console.error("Hint:", convError.hint);
    } else {
      console.log(`✅ Successfully fetched ${conversations?.length || 0} conversations:`);
      if (conversations && conversations.length > 0) {
        conversations.forEach((conv, i) => {
          console.log(`  ${i + 1}. ${conv.title || "(no title)"} (${conv.id})`);
          console.log(`     Counselor: ${conv.counselor_id}`);
          console.log(`     Updated: ${conv.updated_at}`);
        });
      }
      console.log("");
    }

    // Test 4: Check messages table
    console.log("📊 Test 4: Checking messages table...");
    const { count: msgCount, error: msgCountError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true });

    if (msgCountError) {
      console.error("❌ Error counting messages:", msgCountError);
    } else {
      console.log(`✅ Found ${msgCount || 0} messages\n`);
    }

    // Test 5: Get messages for a specific conversation
    if (conversations && conversations.length > 0) {
      const testConvId = conversations[0].id;
      console.log(`📊 Test 5: Fetching messages for conversation ${testConvId}...`);
      const { data: messages, error: msgError } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", testConvId)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error("❌ Error fetching messages:", msgError);
        console.error("Code:", msgError.code);
        console.error("Message:", msgError.message);
      } else {
        console.log(`✅ Successfully fetched ${messages?.length || 0} messages for conversation`);
        if (messages && messages.length > 0) {
          messages.forEach((msg, i) => {
            console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
          });
        }
        console.log("");
      }
    }

    // Test 6: Check RLS policies
    console.log("📊 Test 6: Testing RLS policies...");
    const { data: testData, error: rlsError } = await supabase
      .from("conversations")
      .select("id")
      .limit(1);

    if (rlsError) {
      console.error("❌ RLS Policy Error:", rlsError);
      console.error("This might indicate RLS is blocking access");
    } else {
      console.log("✅ RLS policies allow access");
    }

    console.log("\n✅ Database connection test completed!");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  }
}

testConnection().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
