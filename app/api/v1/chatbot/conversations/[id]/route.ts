import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("=== GET CONVERSATION START ===");
  try {
    let id: string;
    try {
      const resolvedParams = await params;
      id = resolvedParams.id;
      console.log("Conversation ID from params:", id);
    } catch (paramsError) {
      console.error("Error resolving params:", paramsError);
      // Try to get ID from URL as fallback
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      id = pathParts[pathParts.length - 1];
      console.log("Conversation ID from URL:", id);
    }

    if (!id) {
      console.error("No conversation ID found");
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    console.log("Creating Supabase client...");
    let supabase;
    try {
      supabase = await createClient();
      console.log("Supabase client created");
    } catch (clientError) {
      console.error("Error creating Supabase client:", clientError);
      return NextResponse.json(
        { error: "Failed to initialize database connection", details: clientError instanceof Error ? clientError.message : String(clientError) },
        { status: 500 }
      );
    }

    console.log("Getting user...");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("User:", user?.id, "Auth error:", authError);

    if (authError || !user) {
      console.error("Auth failed:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Querying conversation...");
    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("counselor_id", userId)
      .single();

    if (convError) {
      console.error("Conversation query error:", convError);
      return NextResponse.json(
        { error: "Conversation not found", details: convError.message },
        { status: 404 }
      );
    }

    if (!conversation) {
      console.error("Conversation not found");
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    console.log("Querying messages...");
    // Get messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, role, content, created_at, tool_calls, tool_call_id")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Messages query error:", messagesError);
      console.error("Error code:", messagesError.code);
      console.error("Error details:", messagesError.details);
      console.error("Error hint:", messagesError.hint);
      return NextResponse.json(
        { 
          error: "Failed to fetch messages", 
          details: messagesError.message,
          code: messagesError.code,
          hint: messagesError.hint
        },
        { status: 500 }
      );
    }

    console.log("Success! Returning", messages?.length || 0, "messages");
    return NextResponse.json({
      success: true,
      data: {
        conversation,
        messages: messages || [],
      },
    });
  } catch (error) {
    console.error("Unexpected error in GET conversation:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Include full error details in development
    const errorResponse: any = {
      error: "Internal server error",
      details: errorMessage,
    };
    
    if (process.env.NODE_ENV === "development") {
      errorResponse.stack = errorStack;
      errorResponse.rawError = String(error);
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

