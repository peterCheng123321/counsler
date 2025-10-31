import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

const addCollegeSchema = z.object({
  collegeName: z.string().min(2).max(255),
  applicationType: z.enum(["ED", "EA", "RD", "Rolling"]),
  deadline: z.string().optional(), // ISO date string
  collegeType: z.enum(["Safety", "Target", "Reach"]).optional(),
  applicationStatus: z.string().default("not_started"),
  applicationPortal: z.string().optional(), // e.g., "Common App", "Coalition App", "UC App"
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const supabase = createAdminClient();

    // Verify student exists and belongs to user (in demo mode, skip user check)
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("counselor_id", DEMO_USER_ID)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Get all colleges for this student
    const { data: studentColleges, error } = await supabase
      .from("student_colleges")
      .select("*")
      .eq("student_id", studentId)
      .order("deadline", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching student colleges:", error);
      return NextResponse.json(
        { error: "Failed to fetch student colleges", details: error.message },
        { status: 500 }
      );
    }

    // Fetch college details separately if we have college IDs
    const collegeIds = (studentColleges || [])
      .map((sc: any) => sc.college_id)
      .filter(Boolean);

    let collegesData: any[] = [];
    if (collegeIds.length > 0) {
      const { data: colleges } = await supabase
        .from("colleges")
        .select("*")
        .in("id", collegeIds);
      collegesData = colleges || [];
    }

    // Merge college data with student_colleges
    const data = (studentColleges || []).map((sc: any) => {
      const college = collegesData.find((c: any) => c.id === sc.college_id);
      return {
        ...sc,
        colleges: college || null,
      };
    });

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Unexpected error in GET student colleges:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const supabase = createAdminClient();
    const body = await request.json();
    const validatedData = addCollegeSchema.parse(body);

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("counselor_id", DEMO_USER_ID)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Find or create college
    let collegeId: string;
    const { data: existingCollege } = await supabase
      .from("colleges")
      .select("id")
      .eq("name", validatedData.collegeName)
      .maybeSingle();

    if (existingCollege) {
      collegeId = existingCollege.id;
    } else {
      // Create new college
      const { data: newCollege, error: createError } = await supabase
        .from("colleges")
        .insert({ name: validatedData.collegeName })
        .select("id")
        .single();

      if (createError || !newCollege) {
        console.error("Error creating college:", createError);
        return NextResponse.json(
          { error: "Failed to create college", details: createError?.message },
          { status: 500 }
        );
      }
      collegeId = newCollege.id;
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from("student_colleges")
      .select("id")
      .eq("student_id", studentId)
      .eq("college_id", collegeId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Student is already associated with this college" },
        { status: 409 }
      );
    }

    // Create student-college relationship
    const { data: studentCollege, error } = await supabase
      .from("student_colleges")
      .insert({
        student_id: studentId,
        college_id: collegeId,
        application_type: validatedData.applicationType,
        deadline: validatedData.deadline || null,
        college_type: validatedData.collegeType || null,
        application_status: validatedData.applicationStatus,
        application_portal: validatedData.applicationPortal || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating student-college relationship:", error);
      return NextResponse.json(
        {
          error: "Failed to add college to student",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Fetch college details and merge
    const { data: collegeDetails } = await supabase
      .from("colleges")
      .select("*")
      .eq("id", collegeId)
      .single();

    return NextResponse.json(
      {
        data: {
          ...studentCollege,
          colleges: collegeDetails || null,
        },
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Unexpected error in POST student college:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
