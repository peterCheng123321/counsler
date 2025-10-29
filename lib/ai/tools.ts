/**
 * AI Tools Registry and Execution Handler
 * Defines available tools for function calling and handles their execution
 */

import { AITool, AIToolCall, AIToolResult } from "./types";
import { createClient } from "@/lib/supabase/server";
import { queryCache } from "@/lib/cache/query-cache";
import { DEMO_MODE } from "@/lib/env";
import {
  calculateStudentRiskScore,
  saveRiskScore,
  forecastWorkload,
  detectAnomalies,
} from "@/lib/analysis";
import { createInsight } from "@/lib/insights";
import { aiServiceManager } from "@/lib/ai";

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
  {
    type: "function",
    function: {
      name: "update_student",
      description: "Update student information. Use this to modify student details like name, email, application progress, or GPA.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The UUID of the student to update",
          },
          updates: {
            type: "object",
            description: "Fields to update",
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              applicationProgress: { type: "number", minimum: 0, maximum: 100 },
              gpaUnweighted: { type: "number", minimum: 0, maximum: 5 },
              gpaWeighted: { type: "number", minimum: 0, maximum: 5 },
            },
          },
        },
        required: ["studentId", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_student_note",
      description: "Add a note to a student's record. Use this to record meeting notes, reminders, or important information.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The UUID of the student",
          },
          content: {
            type: "string",
            description: "The note content",
          },
          noteType: {
            type: "string",
            enum: ["general", "meeting", "reminder", "priority"],
            description: "Type of note",
            default: "general",
          },
          isPriority: {
            type: "boolean",
            description: "Whether this is a priority note",
            default: false,
          },
        },
        required: ["studentId", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_student",
      description: "Generate an AI summary of a student's profile, application status, and progress.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The UUID of the student to summarize",
          },
        },
        required: ["studentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_student_risk",
      description: "Calculate a risk score for a student based on their activity, progress, and deadlines.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The UUID of the student",
          },
        },
        required: ["studentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task. Use this to add tasks for yourself or link them to a student.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Task title",
          },
          description: {
            type: "string",
            description: "Task description",
          },
          dueDate: {
            type: "string",
            description: "Due date in YYYY-MM-DD format",
          },
          dueTime: {
            type: "string",
            description: "Due time in HH:MM format (optional)",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Task priority",
            default: "medium",
          },
          studentId: {
            type: "string",
            description: "Optional: Link task to a student",
          },
        },
        required: ["title", "dueDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing task. Use this to modify task details, status, or due dates.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "The UUID of the task to update",
          },
          updates: {
            type: "object",
            description: "Fields to update",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              dueDate: { type: "string" },
              dueTime: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed", "cancelled"],
              },
              studentId: { type: "string" },
            },
          },
        },
        required: ["taskId", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_task_reminder",
      description: "Schedule reminders for a task (1 day, 1 hour, or 15 minutes before due date).",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "The UUID of the task",
          },
          reminder1day: {
            type: "boolean",
            description: "Remind 1 day before",
            default: false,
          },
          reminder1hour: {
            type: "boolean",
            description: "Remind 1 hour before",
            default: false,
          },
          reminder15min: {
            type: "boolean",
            description: "Remind 15 minutes before",
            default: false,
          },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_insight",
      description: "Save an AI-generated insight for later reference. Insights can be about students, tasks, or workspace-level observations.",
      parameters: {
        type: "object",
        properties: {
          entityType: {
            type: "string",
            enum: ["student", "task", "cohort", "workspace"],
            description: "Type of entity this insight relates to",
          },
          entityId: {
            type: "string",
            description: "UUID of the entity (optional for workspace-level insights)",
          },
          kind: {
            type: "string",
            enum: [
              "risk_score",
              "workload_forecast",
              "anomaly",
              "summary",
              "recommendation",
              "trend",
              "lor_draft",
            ],
            description: "Type of insight",
          },
          content: {
            type: "string",
            description: "The insight content",
          },
          metadata: {
            type: "object",
            description: "Additional metadata (optional)",
          },
        },
        required: ["entityType", "kind", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_analysis",
      description: "Run an AI analysis module (risk scoring, workload forecast, anomaly detection, cohort trends, or task efficiency).",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: [
              "risk_scoring",
              "workload_forecast",
              "anomaly_detection",
              "cohort_trends",
              "task_efficiency",
            ],
            description: "Analysis module to run",
          },
          studentId: {
            type: "string",
            description: "Required for risk_scoring module",
          },
          days: {
            type: "number",
            description: "Number of days for workload_forecast (default: 14)",
            default: 14,
          },
        },
        required: ["module"],
      },
    },
  },
];

// Add demo-only tools if DEMO_MODE is enabled
if (DEMO_MODE) {
  aiTools.push({
    type: "function",
    function: {
      name: "generate_lor",
      description: "Generate a Letter of Recommendation draft for a student. Use this to create professional LOR drafts.",
      parameters: {
        type: "object",
        properties: {
          studentId: {
            type: "string",
            description: "The UUID of the student",
          },
          recommender: {
            type: "string",
            description: "Name and title of the recommender",
          },
          targetSchool: {
            type: "string",
            description: "Target school or program name",
          },
        },
        required: ["studentId", "recommender", "targetSchool"],
      },
    },
  });
}

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

      let query = supabase
        .from("students")
        .select("*")
        .eq("counselor_id", userId)
        .order("last_name", { ascending: true });

      if (args.search) {
        query = query.or(
          `first_name.ilike.%${args.search}%,last_name.ilike.%${args.search}%,email.ilike.%${args.search}%`
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

      // Query students who have applications of the specified type
      // First get student IDs with this application type, then filter by counselor_id
      let query = supabase
        .from("student_colleges")
        .select(
          `
          application_type,
          student_id,
          students!inner (
            id,
            counselor_id,
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
        .eq("application_type", args.applicationType)
        .eq("students.counselor_id", userId);

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
        .eq("counselor_id", userId)
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

      let query = supabase
        .from("tasks")
        .select(
          `
          *,
          students (
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .eq("counselor_id", userId)
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

      const { data, error } = await supabase
        .from("tasks")
        .select("*, students(id, first_name, last_name, email)")
        .eq("id", args.taskId)
        .eq("counselor_id", userId)
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

      let query = supabase
        .from("tasks")
        .select(
          `
          *,
          students (
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .eq("counselor_id", userId)
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

    case "update_student": {
      // Verify student belongs to user
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("id", args.studentId)
        .eq("counselor_id", userId)
        .single();

      if (!student) {
        throw new Error("Student not found");
      }

      // Build update object
      const updateData: any = {};
      if (args.updates?.firstName) updateData.first_name = args.updates.firstName;
      if (args.updates?.lastName) updateData.last_name = args.updates.lastName;
      if (args.updates?.email) updateData.email = args.updates.email;
      if (args.updates?.phone !== undefined) updateData.phone = args.updates.phone;
      if (args.updates?.applicationProgress !== undefined)
        updateData.application_progress = args.updates.applicationProgress;
      if (args.updates?.gpaUnweighted !== undefined)
        updateData.gpa_unweighted = args.updates.gpaUnweighted;
      if (args.updates?.gpaWeighted !== undefined)
        updateData.gpa_weighted = args.updates.gpaWeighted;

      const { data, error } = await supabase
        .from("students")
        .update(updateData)
        .eq("id", args.studentId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update student: ${error.message}`);
      }

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: data,
      };
    }

    case "add_student_note": {
      // Verify student belongs to user
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("id", args.studentId)
        .eq("counselor_id", userId)
        .single();

      if (!student) {
        throw new Error("Student not found");
      }

      const { data, error } = await supabase
        .from("notes")
        .insert({
          student_id: args.studentId,
          counselor_id: userId,
          content: args.content,
          note_type: args.noteType || "general",
          is_priority: args.isPriority || false,
          reminder_date: args.reminderDate ? new Date(args.reminderDate).toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add note: ${error.message}`);
      }

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: data,
      };
    }

    case "summarize_student": {
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
        .eq("id", args.studentId)
        .eq("counselor_id", userId)
        .single();

      if (studentError || !student) {
        throw new Error("Student not found");
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
          entity_id: args.studentId,
          kind: "summary",
          content: response.content,
          metadata: {
            generated_at: new Date().toISOString(),
          },
        });

        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: { summary: response.content },
        };
      } catch (error) {
        throw new Error(
          `Failed to generate summary: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    case "compute_student_risk": {
      try {
        const riskResult = await calculateStudentRiskScore(args.studentId);
        await saveRiskScore(args.studentId, riskResult);

        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: riskResult,
        };
      } catch (error) {
        throw new Error(
          `Failed to compute risk score: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    case "create_task": {
      // Verify student belongs to user if provided
      if (args.studentId) {
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("id", args.studentId)
          .eq("counselor_id", userId)
          .single();

        if (!student) {
          throw new Error("Student not found");
        }
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          counselor_id: userId,
          student_id: args.studentId || null,
          title: args.title,
          description: args.description || null,
          due_date: args.dueDate,
          due_time: args.dueTime || null,
          priority: args.priority || "medium",
          status: "pending",
        })
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create task: ${error.message}`);
      }

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: data,
      };
    }

    case "update_task": {
      // Verify task belongs to user
      const { data: task } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", args.taskId)
        .eq("counselor_id", userId)
        .single();

      if (!task) {
        throw new Error("Task not found");
      }

      // Verify student belongs to user if updating studentId
      if (args.updates?.studentId !== undefined && args.updates.studentId !== null) {
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("id", args.updates.studentId)
          .eq("counselor_id", userId)
          .single();

        if (!student) {
          throw new Error("Student not found");
        }
      }

      // Build update object
      const updateData: any = {};
      if (args.updates?.title) updateData.title = args.updates.title;
      if (args.updates?.description !== undefined) updateData.description = args.updates.description;
      if (args.updates?.dueDate) updateData.due_date = args.updates.dueDate;
      if (args.updates?.dueTime !== undefined) updateData.due_time = args.updates.dueTime;
      if (args.updates?.priority) updateData.priority = args.updates.priority;
      if (args.updates?.status) {
        updateData.status = args.updates.status;
        if (args.updates.status === "completed") {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (args.updates?.studentId !== undefined)
        updateData.student_id = args.updates.studentId;

      const { data, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", args.taskId)
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update task: ${error.message}`);
      }

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: data,
      };
    }

    case "schedule_task_reminder": {
      // Verify task belongs to user
      const { data: task } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", args.taskId)
        .eq("counselor_id", userId)
        .single();

      if (!task) {
        throw new Error("Task not found");
      }

      const { data, error } = await supabase
        .from("tasks")
        .update({
          reminder_1day: args.reminder1day || false,
          reminder_1hour: args.reminder1hour || false,
          reminder_15min: args.reminder15min || false,
        })
        .eq("id", args.taskId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to schedule reminder: ${error.message}`);
      }

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: data,
      };
    }

    case "save_insight": {
      const insight = await createInsight({
        entity_type: args.entityType,
        entity_id: args.entityId || null,
        kind: args.kind,
        content: args.content,
        metadata: args.metadata,
      });

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: insight,
      };
    }

    case "run_analysis": {
      let result: any;

      switch (args.module) {
        case "risk_scoring": {
          if (!args.studentId) {
            throw new Error("studentId is required for risk_scoring");
          }
          const riskResult = await calculateStudentRiskScore(args.studentId);
          await saveRiskScore(args.studentId, riskResult);
          result = riskResult;
          break;
        }

        case "workload_forecast": {
          const forecast = await forecastWorkload(args.days || 14);
          result = forecast;
          break;
        }

        case "anomaly_detection": {
          const anomalies = await detectAnomalies();
          result = { anomalies, count: anomalies.length };
          break;
        }

        case "cohort_trends": {
          const { data: students } = await supabase
            .from("students")
            .select("graduation_year, application_progress")
            .eq("counselor_id", userId);

          const cohortMap = new Map<number, { count: number; avgProgress: number }>();
          students?.forEach((student) => {
            const year = student.graduation_year;
            if (!cohortMap.has(year)) {
              cohortMap.set(year, { count: 0, avgProgress: 0 });
            }
            const cohort = cohortMap.get(year)!;
            cohort.count++;
            cohort.avgProgress += student.application_progress || 0;
          });

          const trends = Array.from(cohortMap.entries()).map(([year, data]) => ({
            graduationYear: year,
            studentCount: data.count,
            averageProgress: Math.round((data.avgProgress / data.count) * 100) / 100,
          }));

          result = { trends };
          break;
        }

        case "task_efficiency": {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("status, priority, due_date, completed_at, created_at")
            .eq("counselor_id", userId);

          const total = tasks?.length || 0;
          const completed = tasks?.filter((t) => t.status === "completed").length || 0;
          const overdue = tasks?.filter((t) => {
            if (t.status === "completed") return false;
            const dueDate = new Date(t.due_date);
            return dueDate < new Date();
          }).length || 0;

          const onTimeRate = total > 0 ? (completed / total) * 100 : 0;

          result = {
            totalTasks: total,
            completedTasks: completed,
            overdueTasks: overdue,
            onTimeRate: Math.round(onTimeRate * 100) / 100,
          };
          break;
        }

        default:
          throw new Error(`Unknown module: ${args.module}`);
      }

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result,
      };
    }

    case "generate_lor": {
      if (!DEMO_MODE) {
        throw new Error("LOR generation is only available in demo mode");
      }

      // This would call a demo LOR generation endpoint
      // For now, return a placeholder
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: {
          message: "LOR generation endpoint not yet implemented",
          studentId: args.studentId,
          recommender: args.recommender,
          targetSchool: args.targetSchool,
        },
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}

