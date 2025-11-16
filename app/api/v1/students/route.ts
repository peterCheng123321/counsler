import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryCache } from "@/lib/cache/query-cache";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";
import { getStudentsTool } from "@/lib/ai/tools";

const studentSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().optional(),
  graduationYear: z.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 5),
  gpaUnweighted: z.number().min(0).max(5).optional(),
  gpaWeighted: z.number().min(0).max(5).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const graduationYear = searchParams.get("graduationYear");
    const progressMin = searchParams.get("progressMin");
    const progressMax = searchParams.get("progressMax");

    // Use LangChain tool to fetch students
    const result = await getStudentsTool.func({
      search: search || undefined,
      graduationYear: graduationYear ? parseInt(graduationYear) : undefined,
      progressMin: progressMin ? parseInt(progressMin) : undefined,
      progressMax: progressMax ? parseInt(progressMax) : undefined,
    });

    // Parse the tool result (it returns JSON string)
    const parsed = JSON.parse(result);

    // Check if there was an error
    if (parsed.error) {
      console.error("Students tool error:", parsed.error);
      return NextResponse.json(
        { error: parsed.error, details: parsed.details },
        { status: 500 }
      );
    }

    // Return the students data
    return NextResponse.json({ data: parsed.students, success: true });
  } catch (error) {
    console.error("Unexpected error in GET students:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient(); // Demo mode: Use admin client
    // Demo mode: Skip authentication check
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const validatedData = studentSchema.parse(body);

    const { data, error } = await supabase
      .from("students")
      .insert({
        counselor_id: userId,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        graduation_year: validatedData.graduationYear,
        gpa_unweighted: validatedData.gpaUnweighted,
        gpa_weighted: validatedData.gpaWeighted,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique violation
        return NextResponse.json(
          { error: "Student with this email already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create student" },
        { status: 500 }
      );
    }

    // Invalidate cache
    queryCache.invalidateUser(userId);

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

