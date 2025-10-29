import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/chatbot";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    const url = requestUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("error", error);
    if (errorDescription) {
      url.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error("Session exchange error:", exchangeError);
      const url = requestUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "session_exchange_failed");
      url.searchParams.set("error_description", exchangeError.message);
      return NextResponse.redirect(url);
    }
  } else {
    console.error("No authorization code received");
    const url = requestUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("error", "no_code");
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

