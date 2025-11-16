import { createClient } from "@supabase/supabase-js";

// Admin client with service role key - use only on server side
export function createAdminClient() {
  // CRITICAL SECURITY CHECK: Prevent client-side usage
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() cannot be used on the client side. " +
      "This would expose the service role key and bypass all RLS policies. " +
      "Use createClient() from @/lib/supabase/client instead."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env file."
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}





