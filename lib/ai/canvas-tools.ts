/**
 * Canvas Tools for LangGraph Agent
 *
 * These tools enable the AI agent to interact with UI canvases,
 * such as opening essays for editing directly in the chat interface.
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tool to open an essay in the canvas for editing
 * This will trigger the chatbot UI to show the essay canvas
 */
export const openEssayCanvasTool = new DynamicStructuredTool({
  name: "open_essay_canvas",
  description: `Open an essay in an interactive editing canvas within the chat interface.
  Use this tool when the user wants to view, read, or edit an essay.
  The canvas will display the essay content with editing capabilities.

  Examples of when to use:
  - "Show me John's personal statement"
  - "Open the essay for student X"
  - "Let me edit Sarah's college essay"
  - "I want to review the essay"

  This tool returns essay metadata and triggers the UI to display the canvas.`,

  schema: z.object({
    essay_id: z.string().uuid().describe("The UUID of the essay to open"),
    student_id: z.string().uuid().optional().describe("The student ID (optional, for better context)"),
    reason: z.string().optional().describe("Brief reason for opening (e.g., 'review', 'edit', 'read')"),
  }),

  func: async ({ essay_id, student_id, reason }) => {
    try {
      const supabase = createAdminClient();

      // Fetch the essay
      const { data: essay, error } = await supabase
        .from("essays")
        .select(`
          *,
          student:students!student_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("id", essay_id)
        .single();

      if (error || !essay) {
        return JSON.stringify({
          success: false,
          error: "Essay not found",
          essay_id,
        });
      }

      // Calculate word count
      const wordCount = essay.content
        ? essay.content.trim().split(/\s+/).filter(Boolean).length
        : 0;

      // Return success with essay data
      // The special "__canvas__" prefix signals the UI to open the canvas
      return JSON.stringify({
        success: true,
        __canvas__: {
          type: "essay",
          action: "open",
          data: {
            essay_id: essay.id,
            student_id: essay.student_id,
            student_name: essay.student
              ? `${essay.student.first_name} ${essay.student.last_name}`
              : "Unknown",
            title: essay.title,
            word_count: wordCount,
            status: essay.status,
            prompt: essay.prompt,
            reason: reason || "view",
          }
        },
        message: `Opening essay "${essay.title}" ${essay.student ? `for ${essay.student.first_name} ${essay.student.last_name}` : ""} in the canvas editor.`,
      });
    } catch (error) {
      console.error("[Canvas Tool] Error opening essay:", error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to open essay",
      });
    }
  },
});

/**
 * Tool to search for essays by student name or essay title
 * Useful for finding the right essay to open
 */
export const searchEssaysTool = new DynamicStructuredTool({
  name: "search_essays",
  description: `Search for essays by student name or essay title.
  Use this when you need to find an essay but don't have the essay_id.

  Examples:
  - "Find John's essays"
  - "Search for personal statement essays"
  - "Show essays for student Sarah"`,

  schema: z.object({
    student_name: z.string().optional().describe("Student's first or last name to search for"),
    essay_title: z.string().optional().describe("Essay title keywords to search for"),
    student_id: z.string().uuid().optional().describe("Exact student ID if known"),
    limit: z.number().optional().default(10).describe("Maximum number of results to return"),
  }),

  func: async ({ student_name, essay_title, student_id, limit = 10 }) => {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from("essays")
        .select(`
          id,
          title,
          status,
          word_count,
          prompt,
          student_id,
          created_at,
          student:students!student_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      // Filter by student_id if provided
      if (student_id) {
        query = query.eq("student_id", student_id);
      }

      // Filter by essay title if provided
      if (essay_title) {
        query = query.ilike("title", `%${essay_title}%`);
      }

      const { data: essays, error } = await query;

      if (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }

      // Further filter by student name if provided (client-side)
      let filteredEssays = essays || [];
      if (student_name && filteredEssays.length > 0) {
        const nameLower = student_name.toLowerCase();
        filteredEssays = filteredEssays.filter((essay: any) => {
          if (!essay.student) return false;
          const fullName = `${essay.student.first_name} ${essay.student.last_name}`.toLowerCase();
          return fullName.includes(nameLower) ||
                 essay.student.first_name.toLowerCase().includes(nameLower) ||
                 essay.student.last_name.toLowerCase().includes(nameLower);
        });
      }

      const results = filteredEssays.map((essay: any) => ({
        essay_id: essay.id,
        title: essay.title,
        status: essay.status,
        word_count: essay.word_count || 0,
        student_id: essay.student_id,
        student_name: essay.student
          ? `${essay.student.first_name} ${essay.student.last_name}`
          : "Unknown",
        created_at: essay.created_at,
      }));

      return JSON.stringify({
        success: true,
        count: results.length,
        essays: results,
        message: results.length > 0
          ? `Found ${results.length} essay${results.length > 1 ? 's' : ''}`
          : "No essays found matching your criteria",
      });
    } catch (error) {
      console.error("[Canvas Tool] Error searching essays:", error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to search essays",
      });
    }
  },
});

/**
 * Tool to update essay content
 * This allows the AI to make direct edits to essays
 */
export const updateEssayContentTool = new DynamicStructuredTool({
  name: "update_essay_content",
  description: `Update the content or metadata of an essay.
  Use this when the user asks you to make changes to an essay.

  IMPORTANT: Only use this for AI-assisted edits or when explicitly requested.
  For manual editing, use open_essay_canvas instead.

  Examples:
  - "Fix the grammar in this essay"
  - "Update the title to..."
  - "Change the status to completed"`,

  schema: z.object({
    essay_id: z.string().uuid().describe("The UUID of the essay to update"),
    title: z.string().optional().describe("New essay title"),
    content: z.string().optional().describe("New essay content"),
    status: z.enum(["draft", "in_review", "completed"]).optional().describe("New status"),
    feedback: z.string().optional().describe("Counselor feedback on the essay"),
  }),

  func: async ({ essay_id, title, content, status, feedback }) => {
    try {
      const supabase = createAdminClient();

      // Build update object
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) {
        updates.content = content;
        // Calculate word count
        updates.word_count = content.trim().split(/\s+/).filter(Boolean).length;
      }
      if (status !== undefined) updates.status = status;
      if (feedback !== undefined) updates.feedback = feedback;

      if (Object.keys(updates).length === 0) {
        return JSON.stringify({
          success: false,
          error: "No updates provided",
        });
      }

      // Update the essay
      const { data: essay, error } = await supabase
        .from("essays")
        .update(updates)
        .eq("id", essay_id)
        .select()
        .single();

      if (error || !essay) {
        return JSON.stringify({
          success: false,
          error: error?.message || "Essay not found",
        });
      }

      return JSON.stringify({
        success: true,
        essay_id: essay.id,
        updated_fields: Object.keys(updates),
        message: `Successfully updated essay: ${Object.keys(updates).join(", ")}`,
      });
    } catch (error) {
      console.error("[Canvas Tool] Error updating essay:", error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update essay",
      });
    }
  },
});

/**
 * Tool to open a student profile in the canvas
 */
export const openStudentCanvasTool = new DynamicStructuredTool({
  name: "open_student_canvas",
  description: `Open a student's profile in an interactive canvas within the chat interface.
  Use this when the user wants to view detailed information about a specific student.

  **IMPORTANT**: You MUST have the exact student_id (UUID) before calling this tool.
  If you don't have the student_id, use get_students with search parameter first.

  Examples of when to use:
  - "Show me John's profile" → First search for John with get_students, then use this tool
  - "Open Sarah's student information" → First search for Sarah, then use this tool
  - "I want to see details for student X" → First find student X, then use this tool
  - "View this student's academic info" → Use after finding the student

  This displays comprehensive student information including contact, academics, and progress.`,

  schema: z.object({
    student_id: z.string().uuid().describe("The UUID of the student to open"),
    reason: z.string().optional().describe("Brief reason for opening (e.g., 'view profile', 'check progress')"),
  }),

  func: async ({ student_id, reason }) => {
    try {
      const supabase = createAdminClient();

      // Fetch the student
      const { data: student, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", student_id)
        .single();

      if (error || !student) {
        return JSON.stringify({
          success: false,
          error: "Student not found",
          student_id,
          message: `Could not find student with ID ${student_id}. Make sure you searched for the student first using get_students before calling this tool.`,
          suggestion: "Use get_students to search for the student by name first, then use the returned student ID.",
        });
      }

      // Return success with special canvas marker
      return JSON.stringify({
        success: true,
        __canvas__: {
          type: "student",
          action: "open",
          data: {
            student_id: student.id,
            student_name: `${student.first_name} ${student.last_name}`,
            gpa: student.gpa,
            progress: student.application_progress,
            reason: reason || "view",
          }
        },
        message: `Opening profile for ${student.first_name} ${student.last_name} in the canvas viewer.`,
      });
    } catch (error) {
      console.error("[Canvas Tool] Error opening student:", error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to open student profile",
      });
    }
  },
});

// Export all canvas tools
export const canvasTools = [
  openEssayCanvasTool,
  searchEssaysTool,
  updateEssayContentTool,
  openStudentCanvasTool,
];
