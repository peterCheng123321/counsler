/**
 * LangChain Tools Implementation
 * Wraps existing database query tools for use with LangChain agents
 */

import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryCache } from "@/lib/cache/query-cache";
import { DEMO_USER_ID } from "@/lib/constants";

// Tool 1: Get Students
export const getStudentsTool = new DynamicStructuredTool({
  name: "get_students",
  description:
    "Query students with optional filters. Use this to find students by name, graduation year, or application progress.",
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
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

    const result = data || [];
    queryCache.set(userId, "students", result, cacheKey);

    return JSON.stringify(result);
  },
});

// Tool 2: Get Students by Application Type
export const getStudentsByApplicationTypeTool = new DynamicStructuredTool({
  name: "get_students_by_application_type",
  description:
    "Query students by their college application type (Early Decision, Early Action, Regular Decision, Rolling). Returns students who have at least one application of the specified type.",
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
      throw new Error(
        `Failed to fetch students by application type: ${error.message}`
      );
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

    return JSON.stringify(result);
  },
});

// Tool 3: Get Student Details
export const getStudentTool = new DynamicStructuredTool({
  name: "get_student",
  description:
    "Get detailed information about a specific student by ID, including their colleges, essays, activities, and notes.",
  schema: z.object({
    studentId: z
      .string()
      .describe("The unique identifier (UUID) of the student"),
  }),
  func: async ({ studentId }) => {
    const supabase = createAdminClient();

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
      throw new Error(`Failed to fetch student: ${error.message}`);
    }

    if (!data) {
      throw new Error("Student not found");
    }

    return JSON.stringify(data);
  },
});

// Tool 4: Get Tasks
export const getTasksTool = new DynamicStructuredTool({
  name: "get_tasks",
  description:
    "Query tasks with optional filters. Use this to find tasks by status, priority, student, or due date range.",
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
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    const result = data || [];
    queryCache.set(userId, "tasks", result, cacheKey);

    return JSON.stringify(result);
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
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    if (!data) {
      throw new Error("Task not found");
    }

    return JSON.stringify(data);
  },
});

// Tool 6: Get Upcoming Deadlines
export const getUpcomingDeadlinesTool = new DynamicStructuredTool({
  name: "get_upcoming_deadlines",
  description:
    "Get tasks with upcoming deadlines within a date range. Useful for finding deadlines this week, month, or custom range.",
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
      throw new Error(`Failed to fetch upcoming deadlines: ${error.message}`);
    }

    const result = data || [];
    queryCache.set(userId, "tasks", result, cacheKey);

    return JSON.stringify(result);
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
