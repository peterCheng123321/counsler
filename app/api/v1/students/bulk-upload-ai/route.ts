/**
 * AI-Powered Bulk Upload API
 * Uses AI to intelligently parse and process CSV/Excel files
 */

import { NextRequest, NextResponse } from "next/server";
import { createLLM } from "@/lib/ai/llm-factory";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";
import { z } from "zod";

const studentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  graduationYear: z.number().int().min(2020).max(2035),
  gpaUnweighted: z.number().min(0).max(4.0).optional(),
  gpaWeighted: z.number().min(0).max(5.0).optional(),
  satScore: z.number().int().min(400).max(1600).optional(),
  actScore: z.number().int().min(1).max(36).optional(),
  applicationProgress: z.number().int().min(0).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileContent, fileName } = body;

    if (!fileContent) {
      return NextResponse.json(
        { error: "File content is required" },
        { status: 400 }
      );
    }

    // Step 1: Use AI to analyze and parse the file
    const llm = createLLM({
      temperature: 0.1,
      maxTokens: 4000,
    });

    const prompt = `You are an expert data processor. Analyze this CSV/Excel content and extract student information.

File name: ${fileName || "unknown"}

Content:
${fileContent}

Extract ALL students and convert to this JSON format:
{
  "students": [
    {
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string (optional)",
      "dateOfBirth": "YYYY-MM-DD (optional)",
      "graduationYear": number,
      "gpaUnweighted": number 0-4.0 (optional),
      "gpaWeighted": number 0-5.0 (optional),
      "satScore": number 400-1600 (optional),
      "actScore": number 1-36 (optional),
      "applicationProgress": number 0-100 (optional)
    }
  ],
  "corrections": [
    {"row": number, "field": "string", "original": "string", "corrected": "string", "reason": "string"}
  ],
  "errors": [
    {"row": number, "field": "string", "error": "string"}
  ]
}

Rules:
1. Intelligently map columns (handle variations like "first_name", "FirstName", "First Name")
2. Fix common errors (typos, formatting issues)
3. Convert all dates to YYYY-MM-DD format
4. Validate emails and fix if possible
5. Infer missing data when safe to do so
6. Report all corrections made
7. Flag errors that need manual review
8. Handle duplicate entries
9. Normalize phone numbers to (XXX) XXX-XXXX format
10. Round GPAs to 2 decimal places

Return ONLY valid JSON, no markdown or explanations.`;

    const response = await llm.invoke([
      { role: "user", content: prompt },
    ]);

    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // Extract JSON from response
    let parsedData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }
      parsedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "AI failed to parse the file correctly", details: content.substring(0, 500) },
        { status: 500 }
      );
    }

    // Step 2: Validate each student
    const validatedStudents: any[] = [];
    const validationErrors: any[] = [];

    for (let i = 0; i < parsedData.students.length; i++) {
      const student = parsedData.students[i];
      try {
        const validated = studentSchema.parse(student);
        validatedStudents.push({
          ...validated,
          rowNumber: i + 1,
          original: student,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationErrors.push({
            row: i + 1,
            student: student,
            errors: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          });
        }
      }
    }

    // Step 3: Return preview for user approval
    return NextResponse.json({
      success: true,
      preview: {
        totalRows: parsedData.students.length,
        validStudents: validatedStudents.length,
        invalidStudents: validationErrors.length,
        students: validatedStudents,
        errors: validationErrors,
        corrections: parsedData.corrections || [],
        aiSuggestions: parsedData.errors || [],
      },
    });

  } catch (error) {
    console.error("[AI Bulk Upload] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process bulk upload",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Confirm and import the validated students
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { students } = body;

    if (!students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: "Students array is required" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Import each student
    for (const student of students) {
      try {
        const { data, error } = await supabase
          .from("students")
          .insert({
            counselor_id: DEMO_USER_ID,
            first_name: student.firstName,
            last_name: student.lastName,
            email: student.email,
            phone: student.phone || null,
            date_of_birth: student.dateOfBirth || null,
            graduation_year: student.graduationYear,
            gpa_unweighted: student.gpaUnweighted || null,
            gpa_weighted: student.gpaWeighted || null,
            sat_score: student.satScore || null,
            act_score: student.actScore || null,
            application_progress: student.applicationProgress || 0,
          })
          .select()
          .single();

        if (error) {
          results.failed++;
          results.errors.push(`Row ${student.rowNumber}: ${error.message}`);
        } else {
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${student.rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error("[AI Bulk Upload Confirm] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to import students",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
