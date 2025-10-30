import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Demo mode is working!",
    timestamp: new Date().toISOString(),
    success: true 
  });
}
