/**
 * Students Tools API Route
 * Handles AI tool calls for student operations (update, add note, summarize, compute risk)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  calculateStudentRiskScore,
  saveRiskScore,
} from "@/lib/analysis";
import { createInsight } from "@/lib/insights";
import { aiServiceManager } from "@/lib/ai";

const updateStudentSchema = z.object({
  studentId: z.string().uuid(),
  updates: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    applicationProgress: z.number().min(0).max(100).optional(),
    gpaUnweighted: z.number().min(0).max(5).optional(),
    gpaWeighted: z.number().min(0).max(5).optional(),
  }),
});

const addNoteSchema = z.object({
  studentId: z.string().uuid(),
  content: z.string().min(1),
  noteType: z.enum(["general", "meeting", "reminder", "priority"]).default("general"),
  isPriority: z.boolean().default(false),
  reminderDate: z.string().optional(),
});

const summarizeSchema = z.object({
  studentId: z.string().uuid(),
});

const computeRiskSchema = z.object({
  studentId: z.string().uuid(),
});

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
    const { action, ...params } = body;

    switch (action) {
      case "update_student": {
        const { studentId, updates } = updateStudentSchema.parse(params);

        // Verify student belongs to user
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("id", studentId)
          .eq("counselor_id", user.id)
          .single();

        if (!student) {
          return NextResponse.json(
            { error: "Student not found" },
            { status: 404 }
          );
        }

        // Build update object
        const updateData: any = {};
        if (updates.firstName) updateData.first_name = updates.firstName;
        if (updates.lastName) updateData.last_name = updates.lastName;
        if (updates.email) updateData.email = updates.email;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.applicationProgress !== undefined)
          updateData.application_progress = updates.applicationProgress;
        if (updates.gpaUnweighted !== undefined)
          updateData.gpa_unweighted = updates.gpaUnweighted;
        if (updates.gpaWeighted !== undefined)
          updateData.gpa_weighted = updates.gpaWeighted;

        const { data, error } = await supabase
          .from("students")
          .update(updateData)
          .eq("id", studentId)
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { error: `Failed to update student: ${error.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data });
      }

      case "add_note": {
        const { studentId, content, noteType, isPriority, reminderDate } =
          addNoteSchema.parse(params);

        // Verify student belongs to user
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("id", studentId)
          .eq("counselor_id", user.id)
          .single();

        if (!student) {
          return NextResponse.json(
            { error: "Student not found" },
            { status: 404 }
          );
        }

        const { data, error } = await supabase
          .from("notes")
          .insert({
            student_id: studentId,
            counselor_id: user.id,
            content,
            note_type: noteType,
            is_priority: isPriority,
            reminder_date: reminderDate ? new Date(reminderDate).toISOString() : null,
          })
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { error: `Failed to add note: ${error.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data });
      }

      case "summarize": {
        const { studentId } = summarizeSchema.parse(params);

        // Verify student belongs to user
        const { data: student, error: studentError } = await supabase
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
            notes (*),
            tasks (*)
          `
          )
          .eq("id", studentId)
          .eq("counselor_id", user.id)
          .single();

        if (studentError || !student) {
          return NextResponse.json(
            { error: "Student not found" },
            { status: 404 }
          );
        }

        // Generate summary using AI
        const prompt = `Summarize this student's profile and application status:

Student: ${student.first_name} ${student.last_name}
Email: ${student.email}
Graduation Year: ${student.graduation_year}
Application Progress: ${student.application_progress || 0}%
GPA (Unweighted): ${student.gpa_unweighted || "N/A"}
GPA (Weighted): ${student.gpa_weighted || "N/A"}

Colleges: ${student.student_colleges?.length || 0} applications
Essays: ${student.essays?.length || 0}
Activities: ${student.activities?.length || 0}
Notes: ${student.notes?.length || 0}
Tasks: ${student.tasks?.length || 0}

Provide a concise 2-3 paragraph summary highlighting key achievements, application status, and any concerns.`;

        try {
          const response = await aiServiceManager.chat(
            [{ role: "user", content: prompt }],
            {
              temperature: 0.7,
              maxTokens: 500,
            }
          );

          // Save as insight
          await createInsight({
            entity_type: "student",
            entity_id: studentId,
            kind: "summary",
            content: response.content,
            metadata: {
              generated_at: new Date().toISOString(),
            },
          });

          return NextResponse.json({
            success: true,
            data: { summary: response.content },
          });
        } catch (error) {
          return NextResponse.json(
            {
              error: `Failed to generate summary: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
            { status: 500 }
          );
        }
      }

      case "compute_risk": {
        const { studentId } = computeRiskSchema.parse(params);

        try {
          const riskResult = await calculateStudentRiskScore(studentId);
          await saveRiskScore(studentId, riskResult);

          return NextResponse.json({
            success: true,
            data: riskResult,
          });
        } catch (error) {
          return NextResponse.json(
            {
              error: `Failed to compute risk score: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Students tools error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

