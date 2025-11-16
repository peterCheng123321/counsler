import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

// GET - Get a specific letter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; letterId: string }> }
) {
  try {
    const { letterId } = await params;
    const supabase = createAdminClient();

    const { data: letter, error } = await supabase
      .from("letters_of_recommendation")
      .select("*")
      .eq("id", letterId)
      .single();

    if (error) {
      console.error("Error fetching letter:", error);
      return NextResponse.json(
        { error: "Letter not found", details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: letter, success: true });
  } catch (error: any) {
    console.error("Error in GET /api/v1/students/[id]/letters/[letterId]:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a letter
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; letterId: string }> }
) {
  try {
    const { letterId } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    // Update the letter
    const { data: letter, error: updateError } = await supabase
      .from("letters_of_recommendation")
      .update({
        program_type: body.program_type,
        relationship_type: body.relationship_type,
        relationship_duration: body.relationship_duration,
        relationship_context: body.relationship_context,
        specific_examples: body.specific_examples,
        generated_content: body.generated_content,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", letterId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating letter:", updateError);
      return NextResponse.json(
        { error: "Failed to update letter", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: letter, success: true });
  } catch (error: any) {
    console.error("Error in PUT /api/v1/students/[id]/letters/[letterId]:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a letter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; letterId: string }> }
) {
  try {
    const { letterId } = await params;
    const supabase = createAdminClient();

    // Delete the letter
    const { error: deleteError } = await supabase
      .from("letters_of_recommendation")
      .delete()
      .eq("id", letterId);

    if (deleteError) {
      console.error("Error deleting letter:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete letter", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/v1/students/[id]/letters/[letterId]:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
