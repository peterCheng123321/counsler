/**
 * Environment variable validation
 * Call this at app startup to ensure all required env vars are present
 */

const requiredEnvVars = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
  
  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
  AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  
  // Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  
  // Pinecone
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
} as const;

// Demo mode flags (optional)
export const DEMO_MODE = process.env.DEMO_MODE === "true";
export const DEMO_PUBLIC_READ = process.env.DEMO_PUBLIC_READ === "true";
export const DEMO_WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID || "00000000-0000-0000-0000-000000000000";

export function validateEnv() {
  const missing: string[] = [];

  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please check your .env file or environment configuration."
    );
  }

  return true;
}

// Optional: Validate on module load (for server-side)
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.warn("Environment validation warning:", error);
    }
  }
}

