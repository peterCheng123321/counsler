/**
 * College Management Tools
 * Query colleges and manage student college lists
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================================
// COLLEGE QUERY TOOLS
// ============================================================================

/**
 * Get list of colleges with filters
 */
export const getCollegesTool = new DynamicStructuredTool({
  name: "get_colleges",
  description: `Query colleges with optional filters.
  Use this to search for colleges by name, state, or acceptance rate.
  Returns college information including name, location, acceptance rate, and rankings.

  Examples:
  - "List all colleges"
  - "Find colleges in California"
  - "Show colleges with acceptance rate under 20%"
  - "Search for Stanford"`,

  schema: z.object({
    search: z.string().optional().describe("Search by college name"),
    state: z.string().optional().describe("Filter by US state (e.g., 'CA', 'NY', 'MA')"),
    acceptance_rate_max: z.number().optional().describe("Maximum acceptance rate (0-100)"),
    limit: z.number().optional().default(50).describe("Maximum number of results"),
  }),

  func: async ({ search, state, acceptance_rate_max, limit = 50 }) => {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from("colleges")
        .select("*")
        .order("name", { ascending: true })
        .limit(limit);

      if (search) {
        const sanitized = search.replace(/[^a-zA-Z0-9\s]/g, "").trim();
        query = query.ilike("name", `%${sanitized}%`);
      }

      if (state) {
        query = query.eq("location_state", state.toUpperCase());
      }

      if (acceptance_rate_max !== undefined) {
        query = query.lte("acceptance_rate", acceptance_rate_max);
      }

      const { data: colleges, error } = await query;

      if (error) {
        console.error("[College Tool] Error fetching colleges:", error);
        return JSON.stringify({
          success: false,
          error: "Failed to fetch colleges",
          message: error.message,
        });
      }

      const result = (colleges || []).map((c: any) => ({
        college_id: c.id,
        name: c.name,
        state: c.location_state,
        city: c.location_city,
        acceptance_rate: c.acceptance_rate,
        type: c.type,
        website: c.website_url,
      }));

      return JSON.stringify({
        success: true,
        colleges: result,
        count: result.length,
        filters: { search, state, acceptance_rate_max },
        message: result.length > 0
          ? `Found ${result.length} college${result.length > 1 ? 's' : ''}`
          : "No colleges found matching criteria. Try broadening your search.",
      });
    } catch (error) {
      console.error("[College Tool] Error:", error);
      return JSON.stringify({
        success: false,
        error: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// ============================================================================
// COLLEGE MANAGEMENT TOOLS
// ============================================================================

/**
 * Remove college from student's application list
 */
export const removeCollegeFromStudentTool = new DynamicStructuredTool({
  name: "remove_college_from_student",
  description: `Propose removing a college from a student's application list. Requires user confirmation.
  Use this when a student changes their mind and wants to remove a college.

  Examples:
  - "Remove Stanford from Sophia's college list"
  - "Delete MIT from Emily's applications"`,

  schema: z.object({
    student_id: z.string().uuid().describe("The student ID (UUID)"),
    college_id: z.string().uuid().describe("The college ID (UUID) to remove"),
  }),

  func: async ({ student_id, college_id }) => {
    try {
      const supabase = createAdminClient();

      // Fetch student and college names for confirmation message
      const [studentResult, collegeResult] = await Promise.all([
        supabase
          .from("students")
          .select("first_name, last_name")
          .eq("id", student_id)
          .single(),
        supabase
          .from("colleges")
          .select("name, location_state")
          .eq("id", college_id)
          .single(),
      ]);

      if (studentResult.error || !studentResult.data) {
        return JSON.stringify({
          success: false,
          error: "Student not found",
          message: `No student found with ID ${student_id}`,
        });
      }

      if (collegeResult.error || !collegeResult.data) {
        return JSON.stringify({
          success: false,
          error: "College not found",
          message: `No college found with ID ${college_id}`,
        });
      }

      const student = studentResult.data;
      const college = collegeResult.data;

      return JSON.stringify({
        action: "remove_college_from_student",
        status: "pending_confirmation",
        entity: "student_college",
        data: {
          student_id,
          college_id,
        },
        message: `I will remove the following college from the student's application list:\n- College: ${college.name}${college.location_state ? ` (${college.location_state})` : ""}\n- Student: ${student.first_name} ${student.last_name}\n\n**Please confirm this action.**`,
      });
    } catch (error) {
      console.error("[College Tool] Error preparing removal:", error);
      return JSON.stringify({
        success: false,
        error: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Get student's college list
 */
export const getStudentCollegesTool = new DynamicStructuredTool({
  name: "get_student_colleges",
  description: `Get the list of colleges a student is applying to.
  Returns college details along with application type (ED, EA, RD, Rolling) and status.

  Examples:
  - "Show me Sophia's college list"
  - "What colleges is Emily applying to?"`,

  schema: z.object({
    student_id: z.string().uuid().describe("The student ID (UUID)"),
  }),

  func: async ({ student_id }) => {
    try {
      const supabase = createAdminClient();

      const { data: studentColleges, error } = await supabase
        .from("student_colleges")
        .select(`
          id,
          application_type,
          application_status,
          deadline,
          college:colleges!college_id (
            id,
            name,
            state,
            city,
            acceptance_rate,
            ranking
          )
        `)
        .eq("student_id", student_id);

      if (error) {
        console.error("[College Tool] Error fetching student colleges:", error);
        return JSON.stringify({
          success: false,
          error: "Failed to fetch student colleges",
          message: error.message,
        });
      }

      const result = (studentColleges || []).map((sc: any) => ({
        student_college_id: sc.id,
        college_id: sc.college?.id,
        college_name: sc.college?.name,
        state: sc.college?.location_state,
        city: sc.college?.location_city,
        acceptance_rate: sc.college?.acceptance_rate,
        type: sc.college?.type,
        application_type: sc.application_type,
        application_status: sc.application_status,
        deadline: sc.deadline,
      }));

      return JSON.stringify({
        success: true,
        student_id,
        colleges: result,
        count: result.length,
        message: result.length > 0
          ? `Student is applying to ${result.length} college${result.length > 1 ? 's' : ''}`
          : "Student has no colleges in their application list yet",
      });
    } catch (error) {
      console.error("[College Tool] Error:", error);
      return JSON.stringify({
        success: false,
        error: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Export all college tools
export const collegeTools = [
  getCollegesTool,
  removeCollegeFromStudentTool,
  getStudentCollegesTool,
];
