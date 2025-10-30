import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Check database connectivity
    const supabase = createAdminClient();
    const { error: dbError } = await supabase.from("users").select("count").limit(1);

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: dbError ? "unhealthy" : "healthy",
      },
    };

    const statusCode = dbError ? 503 : 200;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}


