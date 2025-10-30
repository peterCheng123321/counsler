/**
 * LangChain Tools Implementation
 * Wraps existing database query tools for use with LangChain agents
 * All tools include comprehensive error handling and graceful fallbacks
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryCache } from "@/lib/cache/query-cache";
import { DEMO_USER_ID } from "@/lib/constants";

// Tool 1: Get Students
export const getStudentsTool = new DynamicStructuredTool({
  name: "get_students",
  description:
    "Query students with optional filters. Use this to find students by name, graduation year, or application progress. Always returns data even if filters don't match anything.",
  schema: z.object({
    search: z
      .string()
      .optional()
      .describe("Search term to filter by student name or email"),
    graduationYear: z.number().optional().describe("Filter by graduation year"),
    progressMin: z
      .number()
      .optional()
      .describe("Minimum application progress percentage (0-100)"),
    progressMax: z
      .number()
      .optional()
      .describe("Maximum application progress percentage (0-100)"),
  }),
  func: async ({ search, graduationYear, progressMin, progressMax }) => {
    try {
      const supabase = createAdminClient();
      const userId = DEMO_USER_ID;

      // Check cache
      const cacheKey = { search, graduationYear, progressMin, progressMax };
      const cached = queryCache.get(userId, "students", cacheKey);
      if (cached) {
        return JSON.stringify(cached);
      }

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
        query = query.eq("graduation_year", graduationYear);
      }

      if (progressMin !== undefined) {
        query = query.gte("application_progress", progressMin);
      }

      if (progressMax !== undefined) {
        query = query.lte("application_progress", progressMax);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching students:", error);
        return JSON.stringify({
          error: "Failed to fetch students",
          details: error.message,
          students: [],
          count: 0,
        });
      }

      const result = data || [];
      queryCache.set(userId, "students", result, cacheKey);

      return JSON.stringify({
        students: result,
        count: result.length,
        filters: { search, graduationYear, progressMin, progressMax },
      });
    } catch (error) {
      console.error("Unexpected error in get_students:", error);
      return JSON.stringify({
        error: "Unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
        students: [],
        count: 0,
      });
    }
  },
});

// Tool 2: Get Students by Application Type
export const getStudentsByApplicationTypeTool = new DynamicStructuredTool({
  name: "get_students_by_application_type",
  description:
    "Query students by their college application type (Early Decision, Early Action, Regular Decision, Rolling). Returns students who have at least one application of the specified type. Falls back to showing all students if college application data is not available.",
  schema: z.object({
    applicationType: z
      .enum(["ED", "EA", "RD", "Rolling"])
      .describe(
        "Application type: ED (Early Decision), EA (Early Action), RD (Regular Decision), or Rolling"
      ),
    graduationYear: z
      .number()
      .optional()
      .describe("Optional: Filter by graduation year"),
  }),
  func: async ({ applicationType, graduationYear }) => {
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    // Check cache
    const cacheKey = { applicationType, graduationYear };
    const cached = queryCache.get(userId, "students_by_app_type", cacheKey);
    if (cached) {
      return JSON.stringify(cached);
    }

    try {
      let query = supabase
        .from("student_colleges")
        .select(
          `
          application_type,
          student_id,
          students!inner (
            id,
            first_name,
            last_name,
            email,
            graduation_year,
            application_progress,
            gpa_unweighted,
            gpa_weighted
          )
        `
        )
        .eq("application_type", applicationType);

      if (graduationYear) {
        query = query.eq("students.graduation_year", graduationYear);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error querying student_colleges:", error);
        // Fallback: return all students with a note
        const fallbackQuery = supabase
          .from("students")
          .select("id, first_name, last_name, email, graduation_year, application_progress, gpa_unweighted, gpa_weighted")
          .order("last_name", { ascending: true });

        if (graduationYear) {
          fallbackQuery.eq("graduation_year", graduationYear);
        }

        const { data: students, error: studentsError } = await fallbackQuery;

        if (studentsError) {
          return JSON.stringify({
            error: "Failed to fetch students",
            details: studentsError.message,
            students: [],
            count: 0,
          });
        }

        const result = {
          note: `College application data is not available yet. Showing all students${graduationYear ? ` for graduation year ${graduationYear}` : ""}.`,
          students: students || [],
          count: students?.length || 0,
        };

        queryCache.set(userId, "students_by_app_type", result, cacheKey);
        return JSON.stringify(result);
      }

      // If no data found, also fallback
      if (!data || data.length === 0) {
        console.log(`No student_colleges data found for ${applicationType}`);
        // Fallback: return all students with a note
        const fallbackQuery = supabase
          .from("students")
          .select("id, first_name, last_name, email, graduation_year, application_progress, gpa_unweighted, gpa_weighted")
          .order("last_name", { ascending: true });

        if (graduationYear) {
          fallbackQuery.eq("graduation_year", graduationYear);
        }

        const { data: students, error: studentsError } = await fallbackQuery;

        if (studentsError) {
          return JSON.stringify({
            error: "Failed to fetch students",
            details: studentsError.message,
            students: [],
            count: 0,
          });
        }

        const result = {
          note: `No students found with ${applicationType} applications${graduationYear ? ` for graduation year ${graduationYear}` : ""}. Showing all students instead.`,
          students: students || [],
          count: students?.length || 0,
        };

        queryCache.set(userId, "students_by_app_type", result, cacheKey);
        return JSON.stringify(result);
      }

      // Extract unique students
      const studentMap = new Map<string, any>();
      if (data) {
        for (const item of data) {
          if (
            item.students &&
            Array.isArray(item.students) &&
            item.students.length > 0
          ) {
            const student = item.students[0];
            const studentId = student.id;
            if (!studentMap.has(studentId)) {
              studentMap.set(studentId, student);
            }
          } else if (
            item.students &&
            typeof item.students === "object" &&
            !Array.isArray(item.students)
          ) {
            const student = item.students as any;
            const studentId = student.id;
            if (studentId && !studentMap.has(studentId)) {
              studentMap.set(studentId, student);
            }
          }
        }
      }

      const result = Array.from(studentMap.values());
      queryCache.set(userId, "students_by_app_type", result, cacheKey);

      return JSON.stringify({
        students: result,
        count: result.length,
        applicationType,
      });
    } catch (error) {
      // Final fallback - return error with all students
      console.error("Unexpected error in get_students_by_application_type:", error);

      const fallbackQuery = supabase
        .from("students")
        .select("id, first_name, last_name, email, graduation_year, application_progress, gpa_unweighted, gpa_weighted")
        .order("last_name", { ascending: true });

      if (graduationYear) {
        fallbackQuery.eq("graduation_year", graduationYear);
      }

      const { data: students } = await fallbackQuery;

      const result = {
        error: "Could not query by application type",
        note: "Showing all students instead",
        students: students || [],
        count: students?.length || 0,
      };

      return JSON.stringify(result);
    }
  },
});

// Tool 3: Get Student Details
export const getStudentTool = new DynamicStructuredTool({
  name: "get_student",
  description:
    "Get detailed information about a specific student by ID, including their colleges, essays, activities, and notes. Returns basic student info if detailed data is unavailable.",
  schema: z.object({
    studentId: z
      .string()
      .describe("The unique identifier (UUID) of the student"),
  }),
  func: async ({ studentId }) => {
    try {
      const supabase = createAdminClient();

      // Try to get detailed student data with related tables
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
        .eq("id", studentId)
        .single();

      if (error) {
        console.error("Error fetching student details:", error);

        // Fallback: try to get just basic student info
        const { data: basicData, error: basicError } = await supabase
          .from("students")
          .select("*")
          .eq("id", studentId)
          .single();

        if (basicError || !basicData) {
          return JSON.stringify({
            error: "Student not found",
            details: basicError?.message || "No student with this ID",
            studentId,
          });
        }

        return JSON.stringify({
          ...basicData,
          note: "Some related data (colleges, essays, activities, notes) could not be loaded",
          student_colleges: [],
          essays: [],
          activities: [],
          notes: [],
        });
      }

      if (!data) {
        return JSON.stringify({
          error: "Student not found",
          studentId,
        });
      }

      return JSON.stringify(data);
    } catch (error) {
      console.error("Unexpected error in get_student:", error);
      return JSON.stringify({
        error: "Unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
        studentId,
      });
    }
  },
});

// Tool 4: Get Tasks
export const getTasksTool = new DynamicStructuredTool({
  name: "get_tasks",
  description:
    "Query tasks with optional filters. Use this to find tasks by status, priority, student, or due date range. Always returns results even if no tasks match the filters.",
  schema: z.object({
    status: z
      .enum(["pending", "in_progress", "completed", "cancelled"])
      .optional()
      .describe("Filter by task status"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Filter by task priority"),
    studentId: z.string().optional().describe("Filter by student ID (UUID)"),
    dueDateFrom: z
      .string()
      .optional()
      .describe("Filter tasks due on or after this date (YYYY-MM-DD)"),
    dueDateTo: z
      .string()
      .optional()
      .describe("Filter tasks due on or before this date (YYYY-MM-DD)"),
  }),
  func: async ({ status, priority, studentId, dueDateFrom, dueDateTo }) => {
    try {
      const supabase = createAdminClient();
      const userId = DEMO_USER_ID;

      // Check cache
      const cacheKey = { status, priority, studentId, dueDateFrom, dueDateTo };
      const cached = queryCache.get(userId, "tasks", cacheKey);
      if (cached) {
        return JSON.stringify(cached);
      }

      let query = supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: false });

      if (status) {
        query = query.eq("status", status);
      }

      if (priority) {
        query = query.eq("priority", priority);
      }

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      if (dueDateFrom) {
        query = query.gte("due_date", dueDateFrom);
      }

      if (dueDateTo) {
        query = query.lte("due_date", dueDateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching tasks:", error);
        return JSON.stringify({
          error: "Failed to fetch tasks",
          details: error.message,
          tasks: [],
          count: 0,
        });
      }

      const result = data || [];
      queryCache.set(userId, "tasks", result, cacheKey);

      return JSON.stringify({
        tasks: result,
        count: result.length,
        filters: { status, priority, studentId, dueDateFrom, dueDateTo },
      });
    } catch (error) {
      console.error("Unexpected error in get_tasks:", error);
      return JSON.stringify({
        error: "Unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
        tasks: [],
        count: 0,
      });
    }
  },
});

// Tool 5: Get Task Details
export const getTaskTool = new DynamicStructuredTool({
  name: "get_task",
  description: "Get detailed information about a specific task by ID.",
  schema: z.object({
    taskId: z.string().describe("The unique identifier (UUID) of the task"),
  }),
  func: async ({ taskId }) => {
    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error) {
        console.error("Error fetching task:", error);
        return JSON.stringify({
          error: "Task not found",
          details: error.message,
          taskId,
        });
      }

      if (!data) {
        return JSON.stringify({
          error: "Task not found",
          taskId,
        });
      }

      return JSON.stringify(data);
    } catch (error) {
      console.error("Unexpected error in get_task:", error);
      return JSON.stringify({
        error: "Unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
        taskId,
      });
    }
  },
});

// Tool 6: Get Upcoming Deadlines
export const getUpcomingDeadlinesTool = new DynamicStructuredTool({
  name: "get_upcoming_deadlines",
  description:
    "Get tasks with upcoming deadlines within a date range. Useful for finding deadlines this week, month, or custom range. Always returns results (empty array if no upcoming deadlines).",
  schema: z.object({
    days: z
      .number()
      .optional()
      .default(7)
      .describe("Number of days ahead to look (default: 7 for next week)"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Filter by priority level"),
  }),
  func: async ({ days = 7, priority }) => {
    try {
      const supabase = createAdminClient();
      const userId = DEMO_USER_ID;

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const todayStr = today.toISOString().split("T")[0];
      const futureDateStr = futureDate.toISOString().split("T")[0];

      // Check cache
      const cacheKey = {
        dueDateFrom: todayStr,
        dueDateTo: futureDateStr,
        priority,
      };
      const cached = queryCache.get(userId, "tasks", cacheKey);
      if (cached) {
        return JSON.stringify(cached);
      }

      let query = supabase
        .from("tasks")
        .select("*")
        .gte("due_date", todayStr)
        .lte("due_date", futureDateStr)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: false });

      if (priority) {
        query = query.eq("priority", priority);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching upcoming deadlines:", error);
        return JSON.stringify({
          error: "Failed to fetch upcoming deadlines",
          details: error.message,
          tasks: [],
          count: 0,
          dateRange: { from: todayStr, to: futureDateStr },
        });
      }

      const result = data || [];
      queryCache.set(userId, "tasks", result, cacheKey);

      return JSON.stringify({
        tasks: result,
        count: result.length,
        dateRange: { from: todayStr, to: futureDateStr, days },
        priority,
      });
    } catch (error) {
      console.error("Unexpected error in get_upcoming_deadlines:", error);
      return JSON.stringify({
        error: "Unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
        tasks: [],
        count: 0,
      });
    }
  },
});

// Export all tools as an array
export const langchainTools = [
  getStudentsTool,
  getStudentsByApplicationTypeTool,
  getStudentTool,
  getTasksTool,
  getTaskTool,
  getUpcomingDeadlinesTool,
];
