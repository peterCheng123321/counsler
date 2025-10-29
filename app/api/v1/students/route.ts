import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryCache } from "@/lib/cache/query-cache";
import { z } from "zod";

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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const cached = queryCache.get(user.id, "students", cacheKey);
    if (cached) {
      return NextResponse.json({ data: cached, success: true });
    }

    let query = supabase
      .from("students")
      .select("*")
      .eq("counselor_id", user.id)
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
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    // Cache the result
    queryCache.set(user.id, "students", data || [], cacheKey);

    return NextResponse.json({ data: data || [], success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const validatedData = studentSchema.parse(body);

    const { data, error } = await supabase
      .from("students")
      .insert({
        counselor_id: user.id,
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
      console.error("Database error:", error);
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
    queryCache.invalidateUser(user.id);

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

