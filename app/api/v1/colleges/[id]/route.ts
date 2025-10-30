import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const updateCollegeSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  locationCity: z.string().max(100).optional(),
  locationState: z.string().max(50).optional(),
  locationCountry: z.string().max(100).optional(),
  type: z.string().max(50).optional(),
  acceptanceRate: z.number().min(0).max(100).optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("colleges")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "College not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching college:", error);
      return NextResponse.json(
        { error: "Failed to fetch college", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Unexpected error in GET college:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const body = await request.json();
    const validatedData = updateCollegeSchema.parse(body);

    // Map camelCase to snake_case for database
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.locationCity !== undefined)
      updateData.location_city = validatedData.locationCity;
    if (validatedData.locationState !== undefined)
      updateData.location_state = validatedData.locationState;
    if (validatedData.locationCountry !== undefined)
      updateData.location_country = validatedData.locationCountry;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.acceptanceRate !== undefined)
      updateData.acceptance_rate = validatedData.acceptanceRate;
    if (validatedData.logoUrl !== undefined)
      updateData.logo_url = validatedData.logoUrl;
    if (validatedData.websiteUrl !== undefined)
      updateData.website_url = validatedData.websiteUrl;

    const { data, error } = await supabase
      .from("colleges")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "College not found" },
          { status: 404 }
        );
      }
      console.error("Error updating college:", error);
      return NextResponse.json(
        { error: "Failed to update college", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Unexpected error in PATCH college:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase.from("colleges").delete().eq("id", id);

    if (error) {
      console.error("Error deleting college:", error);
      return NextResponse.json(
        { error: "Failed to delete college", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in DELETE college:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
