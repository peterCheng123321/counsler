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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createMigrationFunction() {
  console.log("🔧 Creating SQL execution function...\n");

  // Create a function to execute SQL (if allowed)
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_text text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_text;
    END;
    $$;
  `;

  // Try to create the function via RPC
  console.log("Attempting to create exec_sql function...");
  
  // Since we can't execute raw SQL via JS client, we need to use Supabase Dashboard
  console.log("\n❌ Cannot execute ALTER TABLE via Supabase JS client");
  console.log("\n✅ SOLUTION: Run this SQL in Supabase Dashboard:\n");
  console.log("=".repeat(80));
  
  const migrationFile = path.join(process.cwd(), "supabase/migrations/20241029000005_fix_schema_mismatch.sql");
  const sql = fs.readFileSync(migrationFile, "utf-8");
  console.log(sql);
  console.log("=".repeat(80));
  
  console.log("\n📋 Quick Link:");
  const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log("\n💡 Copy the SQL above, paste it in the SQL Editor, and click 'Run'");
}

createMigrationFunction().then(() => process.exit(0)).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

