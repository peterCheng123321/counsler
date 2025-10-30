import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const collegeSchema = z.object({
  name: z.string().min(2).max(255),
  locationCity: z.string().max(100).optional(),
  locationState: z.string().max(50).optional(),
  locationCountry: z.string().max(100).default("USA"),
  type: z.string().max(50).optional(), // e.g., "Liberal Arts", "Research University", "Community College"
  acceptanceRate: z.number().min(0).max(100).optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("colleges")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    // Search by name or location if provided
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,location_city.ilike.%${search}%,location_state.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching colleges:", error);
      return NextResponse.json(
        { error: "Failed to fetch colleges", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      count,
      success: true,
    });
  } catch (error) {
    console.error("Unexpected error in GET colleges:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const validatedData = collegeSchema.parse(body);

    const { data, error } = await supabase
      .from("colleges")
      .insert({
        name: validatedData.name,
        location_city: validatedData.locationCity,
        location_state: validatedData.locationState,
        location_country: validatedData.locationCountry,
        type: validatedData.type,
        acceptance_rate: validatedData.acceptanceRate,
        logo_url: validatedData.logoUrl,
        website_url: validatedData.websiteUrl,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique violation
        return NextResponse.json(
          { error: "College with this name and location already exists" },
          { status: 409 }
        );
      }
      console.error("Error creating college:", error);
      return NextResponse.json(
        { error: "Failed to create college", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Unexpected error in POST college:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
