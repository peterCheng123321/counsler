import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

const updateStudentSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  graduationYear: z.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 5).optional(),
  gpaUnweighted: z.number().min(0).max(5).optional(),
  gpaWeighted: z.number().min(0).max(5).optional(),
  applicationProgress: z.number().min(0).max(100).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient(); // Demo mode: Use admin client
    // Demo mode: Skip authentication check
    const userId = DEMO_USER_ID;

    const { data, error } = await supabase
      .from("students")
      .select(
        `
        *,
        student_colleges (
          *,
          colleges (*)
        ),
        essays (*),
        activities (*),
        notes (*)
      `
      )
      .eq("id", id)
      .eq("counselor_id", userId)
      .single();

    if (error) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient(); // Demo mode: Use admin client
    // Demo mode: Skip authentication check
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const validatedData = updateStudentSchema.parse(body);

    // Map camelCase to snake_case for database
    const updateData: Record<string, unknown> = {};
    if (validatedData.firstName !== undefined) updateData.first_name = validatedData.firstName;
    if (validatedData.lastName !== undefined) updateData.last_name = validatedData.lastName;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.graduationYear !== undefined) updateData.graduation_year = validatedData.graduationYear;
    if (validatedData.gpaUnweighted !== undefined) updateData.gpa_unweighted = validatedData.gpaUnweighted;
    if (validatedData.gpaWeighted !== undefined) updateData.gpa_weighted = validatedData.gpaWeighted;
    if (validatedData.applicationProgress !== undefined) updateData.application_progress = validatedData.applicationProgress;

    const { data, error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", id)
      .eq("counselor_id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient(); // Demo mode: Use admin client
    // Demo mode: Skip authentication check
    const userId = DEMO_USER_ID;

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id)
      .eq("counselor_id", userId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


