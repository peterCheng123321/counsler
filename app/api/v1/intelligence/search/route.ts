import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  searchEssays,
  searchStudents,
  searchActivities,
  hybridSearch,
  findSimilarEssays,
  findSimilarStudents,
  smartSearch,
} from "@/lib/intelligence/semantic-search";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  searchType: z
    .enum(["students", "essays", "activities", "hybrid", "smart"])
    .optional()
    .default("hybrid"),
  limit: z.number().int().min(1).max(50).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.7),
  includeMetadata: z.boolean().optional().default(true),
});

const similarSearchSchema = z.object({
  entityType: z.enum(["essay", "student"]),
  entityId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).optional().default(5),
  threshold: z.number().min(0).max(1).optional().default(0.75),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Check if this is a similarity search
    if (body.entityType && body.entityId) {
      const { entityType, entityId, limit, threshold } =
        similarSearchSchema.parse(body);

      let results;
      if (entityType === "essay") {
        results = await findSimilarEssays(entityId, { limit, threshold });
      } else {
        results = await findSimilarStudents(entityId, { limit, threshold });
      }

      return NextResponse.json({
        success: true,
        data: {
          results,
          count: results.length,
          entityType,
        },
      });
    }

    // Regular search
    const { query, searchType, limit, threshold, includeMetadata } =
      searchSchema.parse(body);

    let results: any;

    switch (searchType) {
      case "students":
        results = await searchStudents(query, { limit, threshold });
        break;

      case "essays":
        results = await searchEssays(query, {
          limit,
          threshold,
          includeMetadata,
        });
        break;

      case "activities":
        results = await searchActivities(query, { limit, threshold });
        break;

      case "smart":
        // AI-powered query interpretation
        results = await smartSearch(query, { limit, threshold, includeMetadata });
        return NextResponse.json({
          success: true,
          data: results,
        });

      case "hybrid":
      default:
        // Search all types
        results = await hybridSearch(
          query,
          ["students", "essays", "activities"],
          { limit, threshold, includeMetadata }
        );
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        count: Array.isArray(results) ? results.length : 0,
        query,
        searchType,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Semantic search error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to execute search";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
