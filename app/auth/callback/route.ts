import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/chatbot";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  console.log("OAuth Callback:", {
    code: code ? "present" : "missing",
    error,
    errorDescription,
    next,
    origin: requestUrl.origin,
  });

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    const url = new URL("/auth/login", requestUrl.origin);
    url.searchParams.set("error", error);
    if (errorDescription) {
      url.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(url);
  }

  if (!code) {
    console.error("No authorization code received");
    const url = new URL("/auth/login", requestUrl.origin);
    url.searchParams.set("error", "no_code");
    url.searchParams.set("error_description", "No authorization code was returned from Google");
    return NextResponse.redirect(url);
  }

  try {
    const supabase = await createClient();
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error("Session exchange error:", exchangeError);
      const url = new URL("/auth/login", requestUrl.origin);
      url.searchParams.set("error", "session_exchange_failed");
      url.searchParams.set("error_description", exchangeError.message);
      return NextResponse.redirect(url);
    }

    if (!sessionData.session) {
      console.error("No session created after code exchange");
      const url = new URL("/auth/login", requestUrl.origin);
      url.searchParams.set("error", "no_session");
      url.searchParams.set("error_description", "Failed to create user session");
      return NextResponse.redirect(url);
    }

    console.log("OAuth success - redirecting to:", next);
    
    // Use absolute URL for redirect to ensure it works correctly
    const redirectUrl = new URL(next, requestUrl.origin);
    const response = NextResponse.redirect(redirectUrl);
    
    // Ensure cookies are set properly
    return response;
  } catch (err) {
    console.error("Unexpected error in callback:", err);
    const url = new URL("/auth/login", requestUrl.origin);
    url.searchParams.set("error", "unexpected_error");
    url.searchParams.set("error_description", err instanceof Error ? err.message : "An unexpected error occurred");
    return NextResponse.redirect(url);
  }
}

