import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryCache } from "@/lib/cache/query-cache";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

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
    const supabase = createAdminClient(); // Demo mode: Use admin client
    // Demo mode: Skip authentication check
    const userId = DEMO_USER_ID;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const graduationYear = searchParams.get("graduationYear");
    const progressMin = searchParams.get("progressMin");
    const progressMax = searchParams.get("progressMax");

    // Check cache
    const cacheKey = {
      search: search || undefined,
      graduationYear: graduationYear || undefined,
      progressMin: progressMin || undefined,
      progressMax: progressMax || undefined,
    };
    const cached = queryCache.get(userId, "students", cacheKey);
    if (cached) {
      return NextResponse.json({ data: cached, success: true });
    }

    // For demo purposes: Allow all users to access all mock data
    // Remove counselor_id filter to show all students in database
    let query = supabase
      .from("students")
      .select("*")
      .order("last_name", { ascending: true });

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    if (graduationYear) {
      query = query.eq("graduation_year", parseInt(graduationYear));
    }

    if (progressMin) {
      query = query.gte("application_progress", parseInt(progressMin));
    }

    if (progressMax) {
      query = query.lte("application_progress", parseInt(progressMax));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Students query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch students", details: error.message },
        { status: 500 }
      );
    }

    // If no data found, return empty array (mock data should be in DB)
    // For demo purposes, all users can access any data in the database
    const students = data || [];

    // Cache the result
    queryCache.set(userId, "students", students, cacheKey);

    return NextResponse.json({ data: students, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
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

