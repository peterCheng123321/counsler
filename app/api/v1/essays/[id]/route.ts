import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const updateEssaySchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  prompt: z.string().optional().nullable(),
  word_count: z.number().optional(),
  status: z.enum(["draft", "in_progress", "completed", "reviewed"]).optional(),
  college_id: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: essayId } = await params;
    const supabase = createAdminClient();

    const { data: essay, error } = await supabase
      .from("essays")
      .select("*")
      .eq("id", essayId)
      .single();

    if (error) {
      console.error("Error fetching essay:", error);
      return NextResponse.json(
        { error: "Failed to fetch essay", details: error.message },
        { status: 500 }
      );
    }

    if (!essay) {
      return NextResponse.json(
        { error: "Essay not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: essay, success: true });
  } catch (error) {
    console.error("Unexpected error in GET essay:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: essayId } = await params;
    const supabase = createAdminClient();

    const body = await request.json();
    const validatedData = updateEssaySchema.parse(body);

    // Update essay
    const { data: essay, error } = await supabase
      .from("essays")
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", essayId)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating essay:", error);
      return NextResponse.json(
        { error: "Failed to update essay", details: error.message },
        { status: 500 }
      );
    }

    if (!essay) {
      return NextResponse.json(
        { error: "Essay not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: essay, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Unexpected error in PUT essay:", error);
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
  // PATCH is same as PUT for essays
  return PUT(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: essayId } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("essays")
      .delete()
      .eq("id", essayId);

    if (error) {
      console.error("Error deleting essay:", error);
      return NextResponse.json(
        { error: "Failed to delete essay", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in DELETE essay:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
