"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.push("/chatbot");
      }
    };
    checkUser();

    // Check for OAuth errors
    const oauthError = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    if (oauthError) {
      setError(errorDescription || oauthError);
    }
  }, [router, supabase, searchParams]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the current origin - this will be the Vercel URL in production
      // or localhost in development
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Ensure we have a valid origin
      if (!origin) {
        throw new Error("Unable to determine site URL");
      }
      
      const redirectTo = `${origin}/auth/callback`;
      
      console.log("OAuth redirect URL:", redirectTo); // Debug log

      const { error: oauthError, data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        console.error("Login error:", oauthError);
        setError(oauthError.message || "Failed to initiate Google login");
        setIsLoading(false);
      } else if (data?.url) {
        // Log the URL that Supabase is redirecting to (for debugging)
        console.log("Supabase redirect URL:", data.url);
      }
      // If successful, the user will be redirected, so we don't need to handle that case
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white text-xl font-bold">
          C
        </div>
        <CardTitle className="text-heading-1">Welcome to CAMP</CardTitle>
        <CardDescription>
          College Application Management Platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error-light border border-error p-3 text-sm text-error">
            {error}
          </div>
        )}
        <Button
          onClick={handleGoogleLogin}
          className="w-full"
          size="lg"
          disabled={isLoading}
          loading={isLoading}
        >
          <svg
            className="mr-2 h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {isLoading ? "Connecting..." : "Continue with Google"}
        </Button>
        <p className="text-center text-sm text-text-tertiary">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
        <div className="mt-4 rounded-lg bg-text-tertiary/10 p-3 text-xs text-text-secondary">
          <p className="font-semibold mb-1">Setup Required:</p>
          <p>Make sure Google OAuth is configured in your Supabase dashboard:</p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Go to Supabase Dashboard → Authentication → Providers</li>
            <li>Enable Google provider</li>
            <li>Add authorized redirect URL: <code className="bg-background px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback</code></li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

