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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

// Extract project ref
const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");

console.log(`🚀 Executing Migration for Project: ${projectRef}\n`);

const migrationFile = path.join(process.cwd(), "supabase/migrations/20241029000005_fix_schema_mismatch.sql");
const sql = fs.readFileSync(migrationFile, "utf-8");

// Execute the critical ALTER TABLE command first
console.log("Executing critical schema fix...\n");

const criticalSQL = `
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'chat_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE messages ALTER COLUMN chat_id DROP NOT NULL;
    RAISE NOTICE 'Made chat_id nullable';
  END IF;
END $$;
`;

// Use Supabase Management API
const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function executeSQL(query: string) {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "apikey": serviceKey,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.text();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error };
  }
}

async function runMigration() {
  console.log("📤 Sending SQL to Supabase Management API...\n");
  
  const result = await executeSQL(criticalSQL);
  
  if (result.ok) {
    console.log("✅ Migration executed successfully!");
    console.log("Response:", result.data);
  } else {
    console.error("❌ Migration failed:", result.error || result.data);
    console.error("\n⚠️  The Management API might not support direct SQL execution.");
    console.error("Please run the migration manually:");
    console.error("\n1. Go to: https://supabase.com/dashboard/project/" + projectRef + "/sql");
    console.error("2. Copy and paste the SQL from: supabase/migrations/20241029000005_fix_schema_mismatch.sql");
    console.error("3. Click 'Run'");
  }
}

runMigration().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

