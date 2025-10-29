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

async function checkSchema() {
  console.log("🔍 Checking Actual Database Schema...\n");

  // Get a sample message to see structure

  // Get a sample message to see structure
  const { data: sample } = await supabase
    .from("messages")
    .select("*")
    .limit(1);

  if (sample && sample.length > 0) {
    console.log("📊 Actual columns in messages table:");
    Object.keys(sample[0]).forEach((key, i) => {
      console.log(`  ${i + 1}. ${key}: ${typeof sample[0][key]}${sample[0][key] === null ? ' (null)' : ''}`);
    });
    console.log("\n📋 Sample message structure:");
    console.log(JSON.stringify(sample[0], null, 2));
  }

  // Check conversations table
  const { data: convSample } = await supabase
    .from("conversations")
    .select("*")
    .limit(1);

  if (convSample && convSample.length > 0) {
    console.log("\n📊 Columns in conversations table:");
    Object.keys(convSample[0]).forEach((key, i) => {
      console.log(`  ${i + 1}. ${key}`);
    });
  }
}

checkSchema().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

