import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  // Verify cron secret (Vercel cron protection)
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!CRON_SECRET) {
    console.error("CRON_SECRET is not set in environment variables");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    
    // Find tasks due within next 24 hours that need reminders
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "pending")
      .lte("due_date", tomorrow.toISOString().split("T")[0])
      .gte("due_date", new Date().toISOString().split("T")[0]);

    if (error) {
      console.error("Error fetching tasks:", error);
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }

    // TODO: Send notifications for tasks that need reminders
    // This will be implemented with notification service

    return NextResponse.json({
      success: true,
      tasksProcessed: tasks?.length || 0,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}





