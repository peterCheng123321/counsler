/**
 * AI Tools Registry and Execution Handler
 * Defines available tools for function calling and handles their execution
 */

import { AITool, AIToolCall, AIToolResult } from "./types";
import { createClient } from "@/lib/supabase/server";
import { queryCache } from "@/lib/cache/query-cache";

export const aiTools: AITool[] = [
  {
    type: "function",
    function: {
      name: "get_students",
      description: "Query students with optional filters. Use this to find students by name, graduation year, or application progress.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Search term to filter by student name or email",
          },
          graduationYear: {
            type: "number",
            description: "Filter by graduation year",
          },
          progressMin: {
            type: "number",
            description: "Minimum application progress percentage (0-100)",
          },
          progressMax: {
            type: "number",
            description: "Maximum application progress percentage (0-100)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_students_by_application_type",
      description: "Query students by their college application type (Early Decision, Early Action, Regular Decision, Rolling). Returns students who have at least one application of the specified type.",
      parameters: {
        type: "object",
        properties: {
          applicationType: {
            type: "string",
            enum: ["ED", "EA", "RD", "Rolling"],
            description: "Application type: ED (Early Decision), EA (Early Action), RD (Regular Decision), or Rolling",
          },
          graduationYear: {
            type: "number",
            description: "Optional: Filter by graduation year",
          },
        },
        required: ["applicationType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_student",
      description: "Get detailed information about a specific student by ID, including their colleges, essays, activities, and notes.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The unique identifier (UUID) of the student",
          },
        },
        required: ["studentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Query tasks with optional filters. Use this to find tasks by status, priority, student, or due date range.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed", "cancelled"],
            description: "Filter by task status",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Filter by task priority",
          },
          studentId: {
            type: "string",
            description: "Filter by student ID (UUID)",
          },
          dueDateFrom: {
            type: "string",
            description: "Filter tasks due on or after this date (YYYY-MM-DD)",
          },
          dueDateTo: {
            type: "string",
            description: "Filter tasks due on or before this date (YYYY-MM-DD)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_task",
      description: "Get detailed information about a specific task by ID.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "The unique identifier (UUID) of the task",
          },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_deadlines",
      description: "Get tasks with upcoming deadlines within a date range. Useful for finding deadlines this week, month, or custom range.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days ahead to look (default: 7 for next week)",
            default: 7,
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Filter by priority level",
          },
        },
        required: [],
      },
    },
  },
];

/**
 * Execute a tool call and return the result
 */
export async function executeTool(
  toolCall: AIToolCall,
  userId: string
): Promise<AIToolResult> {
  const supabase = await createClient();
  
  // Parse arguments if string
  let args: Record<string, any>;
  if (typeof toolCall.arguments === "string") {
    try {
      args = JSON.parse(toolCall.arguments);
    } catch {
      args = {};
    }
  } else {
    args = toolCall.arguments;
  }

  switch (toolCall.name) {
    case "get_students": {
      // Check cache
      const cacheKey = {
        search: args.search || undefined,
        graduationYear: args.graduationYear || undefined,
        progressMin: args.progressMin || undefined,
        progressMax: args.progressMax || undefined,
      };
      const cached = queryCache.get(userId, "students", cacheKey);
      if (cached) {
        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: cached,
        };
      }

      // For demo purposes: Allow all users to access all mock data
      // Remove counselor_id filter to show all students in database
      let query = supabase
        .from("students")
        .select("*")
        .order("last_name", { ascending: true });

      if (args.search) {
        // Sanitize search input to prevent SQL injection
        const sanitizedSearch = args.search.replace(/[^a-zA-Z0-9\s]/g, '');
        query = query.or(
          `first_name.ilike.%${sanitizedSearch}%,last_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`
        );
      }

      if (args.graduationYear) {
        query = query.eq("graduation_year", parseInt(args.graduationYear));
      }

      if (args.progressMin !== undefined) {
        query = query.gte("application_progress", parseInt(args.progressMin));
      }

      if (args.progressMax !== undefined) {
        query = query.lte("application_progress", parseInt(args.progressMax));
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch students: ${error.message}`);
      }

      const result = data || [];
      // Cache the result
      queryCache.set(userId, "students", result, cacheKey);

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result,
      };
    }

    case "get_students_by_application_type": {
      if (!args.applicationType) {
        throw new Error("applicationType is required");
      }

      // Check cache
      const cacheKey = {
        applicationType: args.applicationType,
        graduationYear: args.graduationYear || undefined,
      };
      const cached = queryCache.get(userId, "students_by_app_type", cacheKey);
      if (cached) {
        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: cached,
        };
      }

      // For demo: Query students by application type without counselor_id filter
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
        .eq("application_type", args.applicationType);

      // Filter by graduation year if provided
      if (args.graduationYear) {
        query = query.eq("students.graduation_year", parseInt(args.graduationYear));
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch students by application type: ${error.message}`);
      }

      // Extract unique students (a student might have multiple colleges with same app type)
      const studentMap = new Map<string, any>();
      if (data) {
        for (const item of data) {
          if (item.students && Array.isArray(item.students) && item.students.length > 0) {
            const student = item.students[0];
            const studentId = student.id;
            if (!studentMap.has(studentId)) {
              studentMap.set(studentId, student);
            }
          } else if (item.students && typeof item.students === 'object' && !Array.isArray(item.students)) {
            const student = item.students as any;
            const studentId = student.id;
            if (studentId && !studentMap.has(studentId)) {
              studentMap.set(studentId, student);
            }
          }
        }
      }

      const result = Array.from(studentMap.values());
      
      // Cache the result
      queryCache.set(userId, "students_by_app_type", result, cacheKey);

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result,
      };
    }

    case "get_student": {
      if (!args.studentId) {
        throw new Error("studentId is required");
      }

      // For demo: Allow all users to access all students
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
        .eq("id", args.studentId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch student: ${error.message}`);
      }

      if (!data) {
        throw new Error("Student not found");
      }

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: data,
      };
    }

    case "get_tasks": {
      // Check cache
      const cacheKey = {
        status: args.status || undefined,
        priority: args.priority || undefined,
        studentId: args.studentId || undefined,
        dueDateFrom: args.dueDateFrom || undefined,
        dueDateTo: args.dueDateTo || undefined,
      };
      const cached = queryCache.get(userId, "tasks", cacheKey);
      if (cached) {
        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: cached,
        };
      }

      // For demo: Allow all users to access all tasks
      let query = supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: false });

      if (args.status) {
        query = query.eq("status", args.status);
      }

      if (args.priority) {
        query = query.eq("priority", args.priority);
      }

      if (args.studentId) {
        query = query.eq("student_id", args.studentId);
      }

      if (args.dueDateFrom) {
        query = query.gte("due_date", args.dueDateFrom);
      }

      if (args.dueDateTo) {
        query = query.lte("due_date", args.dueDateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      const result = data || [];
      // Cache the result
      queryCache.set(userId, "tasks", result, cacheKey);

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result,
      };
    }

    case "get_task": {
      if (!args.taskId) {
        throw new Error("taskId is required");
      }

      // For demo: Allow all users to access all tasks
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", args.taskId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch task: ${error.message}`);
      }

      if (!data) {
        throw new Error("Task not found");
      }

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: data,
      };
    }

    case "get_upcoming_deadlines": {
      const days = args.days || 7;
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const todayStr = today.toISOString().split("T")[0];
      const futureDateStr = futureDate.toISOString().split("T")[0];

      // Check cache
      const cacheKey = {
        dueDateFrom: todayStr,
        dueDateTo: futureDateStr,
        priority: args.priority || undefined,
      };
      const cached = queryCache.get(userId, "tasks", cacheKey);
      if (cached) {
        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: cached,
        };
      }

      // For demo: Allow all users to access all tasks
      let query = supabase
        .from("tasks")
        .select("*")
        .gte("due_date", todayStr)
        .lte("due_date", futureDateStr)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: false });

      if (args.priority) {
        query = query.eq("priority", args.priority);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch upcoming deadlines: ${error.message}`);
      }

      const result = data || [];
      // Cache the result
      queryCache.set(userId, "tasks", result, cacheKey);

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result,
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}

