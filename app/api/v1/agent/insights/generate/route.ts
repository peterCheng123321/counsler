import { NextRequest, NextResponse } from "next/server";
import { generateInsightsForCounselor, canGenerateInsights } from "@/lib/ai/insight-generator";
import { DEMO_USER_ID } from "@/lib/constants";

/**
 * POST /api/v1/agent/insights/generate
 * Generate new AI-powered insights for a counselor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      counselorId = DEMO_USER_ID,
      category = "all",
      maxInsights = 5,
      force = false,
    } = body;

    console.log(`[Insights API] Generate request from counselor ${counselorId}, category: ${category}`);

    // Rate limiting check (unless forced)
    if (!force) {
      const canGenerate = await canGenerateInsights(counselorId, 60); // 60 minutes minimum
      if (!canGenerate) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: "Insights were generated recently. Please wait at least 1 hour between generations.",
            retryAfter: 60 * 60, // seconds
          },
          { status: 429 }
        );
      }
    }

    // Generate insights
    console.log("[Insights API] Starting insight generation...");
    const startTime = Date.now();

    const insights = await generateInsightsForCounselor({
      counselorId,
      category,
      maxInsights,
      temperature: 0.3,
    });

    const generationTime = Date.now() - startTime;
    console.log(`[Insights API] Generated ${insights.length} insights in ${generationTime}ms`);

    // Return insights
    return NextResponse.json({
      success: true,
      insights,
      count: insights.length,
      highPriority: insights.filter((i) => i.priority === "high").length,
      generationTime: `${(generationTime / 1000).toFixed(2)}s`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Insights API] Error generating insights:", error);

    return NextResponse.json(
      {
        error: "Insight generation failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/agent/insights/generate
 * Check if insights can be generated (rate limit status)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const counselorId = searchParams.get("counselorId") || DEMO_USER_ID;

    const canGenerate = await canGenerateInsights(counselorId, 60);

    return NextResponse.json({
      canGenerate,
      counselorId,
      minimumWaitMinutes: 60,
    });
  } catch (error) {
    console.error("[Insights API] Error checking generation status:", error);

    return NextResponse.json(
      {
        error: "Failed to check generation status",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
