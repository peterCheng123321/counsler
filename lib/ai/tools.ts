/**
 * CONSOLIDATED AI Tools - All Query & Enhanced Tools
 * Combines all tool functionality from tools.ts, langchain-tools.ts, and enhanced-tools.ts
 * Best features: Input sanitization, error handling, NLP capabilities, graceful fallbacks
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryCache } from "@/lib/cache/query-cache";
import { DEMO_USER_ID } from "@/lib/constants";
import { createLLM, createLLMForGeneration } from "./llm-factory";
import {
  extractStudentName,
  extractCollegeInfo,
  extractGPA,
  extractTestScores,
  buildSearchQuery,
  extractEntities,
} from "@/lib/nlp/entity-extractor";

// ============================================================================
// BASIC QUERY TOOLS (6 tools)
// ============================================================================

/**
 * Tool 1: Get Students with Filters
 */
export const getStudentsTool = new DynamicStructuredTool({
  name: "get_students",
  description:
    "Query students with optional filters. Use this to find students by name (first, last, or full), graduation year, or application progress. The search is case-insensitive and matches partial names. If you get 0 results, try searching with just first name or just last name separately. Always returns data even if filters don't match anything.",
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
        // ✅ Sanitize input to prevent SQL injection
        const sanitized = search.replace(/[^a-zA-Z0-9\s]/g, "").trim();

        // Handle multi-word names (e.g., "Sophia Chen")
        const words = sanitized.split(/\s+/).filter(Boolean);

        if (words.length > 1) {
          // Search for each word individually in first_name OR last_name
          // This handles "Sophia Chen" by matching Sophia in first_name OR Chen in last_name
          const wordFilters = words.map(word =>
            `first_name.ilike.%${word}%,last_name.ilike.%${word}%`
          ).join(',');
          query = query.or(wordFilters);
        } else {
          // Single word search - match in first_name, last_name, or email
          query = query.or(
            `first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
          );
        }
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

      // If search returned 0 results, add helpful guidance
      const response: any = {
        students: result,
        count: result.length,
        filters: { search, graduationYear, progressMin, progressMax },
      };

      if (result.length === 0 && search) {
        response.suggestion = `No students found matching "${search}". Try searching with just the first name or last name separately, or call get_students with no filters to see all students.`;
        response.next_steps = [
          "Try searching with just first name",
          "Try searching with just last name",
          "List all students to let user choose",
        ];
      }

      return JSON.stringify(response);
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

/**
 * Tool 2: Get Students by Application Type
 */
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

      if (error || !data || data.length === 0) {
        console.error("Error or no data in student_colleges:", error);
        // Fallback: return all students with a note
        const fallbackQuery = supabase
          .from("students")
          .select(
            "id, first_name, last_name, email, graduation_year, application_progress, gpa_unweighted, gpa_weighted"
          )
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
          note: data?.length === 0
            ? `No students found with ${applicationType} applications${graduationYear ? ` for graduation year ${graduationYear}` : ""}. Showing all students instead.`
            : `College application data is not available yet. Showing all students${graduationYear ? ` for graduation year ${graduationYear}` : ""}.`,
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
      console.error("Unexpected error in get_students_by_application_type:", error);
      // Final fallback
      const fallbackQuery = supabase
        .from("students")
        .select(
          "id, first_name, last_name, email, graduation_year, application_progress, gpa_unweighted, gpa_weighted"
        )
        .order("last_name", { ascending: true });

      if (graduationYear) {
        fallbackQuery.eq("graduation_year", graduationYear);
      }

      const { data: students } = await fallbackQuery;

      return JSON.stringify({
        error: "Could not query by application type",
        note: "Showing all students instead",
        students: students || [],
        count: students?.length || 0,
      });
    }
  },
});

/**
 * Tool 3: Get Student Details by ID
 */
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

/**
 * Tool 4: Get Tasks with Filters
 */
export const getTasksTool = new DynamicStructuredTool({
  name: "get_tasks",
  description:
    "Query tasks and events with optional filters. Use this to find tasks by title/description (interviews, campus visits, deadlines), status, priority, student, or due date range. Always returns results even if no tasks match the filters.",
  schema: z.object({
    search: z
      .string()
      .optional()
      .describe(
        "Search tasks by title or description (e.g., 'MIT interview', 'Stanford tour', 'essay deadline')"
      ),
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
  func: async ({
    search,
    status,
    priority,
    studentId,
    dueDateFrom,
    dueDateTo,
  }) => {
    try {
      const supabase = createAdminClient();
      const userId = DEMO_USER_ID;

      // Check cache
      const cacheKey = {
        search,
        status,
        priority,
        studentId,
        dueDateFrom,
        dueDateTo,
      };
      const cached = queryCache.get(userId, "tasks", cacheKey);
      if (cached) {
        return JSON.stringify(cached);
      }

      let query = supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: false });

      if (search) {
        // ✅ Sanitize search input
        const sanitized = search.replace(/[^a-zA-Z0-9\s]/g, "");
        query = query.or(
          `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
        );
      }

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
        filters: { search, status, priority, studentId, dueDateFrom, dueDateTo },
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

/**
 * Tool 5: Get Task Details by ID
 */
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

/**
 * Tool 6: Get Upcoming Deadlines
 */
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

// ============================================================================
// ENHANCED TOOLS (6 tools)
// ============================================================================

/**
 * Tool 7: Track Application Progress
 */
export const trackApplicationProgressTool = new DynamicStructuredTool({
  name: "track_application_progress",
  description:
    "Track and analyze application progress for students. Identifies students who are behind, at risk, or need check-ins. Returns detailed progress analysis with recommendations.",
  schema: z.object({
    studentId: z
      .string()
      .optional()
      .describe("Specific student ID to analyze, or omit for all students"),
    thresholdBehind: z
      .number()
      .optional()
      .default(40)
      .describe("Progress % threshold to consider 'behind' (default 40)"),
    includeRecommendations: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include personalized recommendations"),
  }),
  func: async ({ studentId, thresholdBehind = 40, includeRecommendations = true }) => {
    try {
      const supabase = createAdminClient();

      // Get students
      let query = supabase.from("students").select("*");
      if (studentId) {
        query = query.eq("id", studentId);
      }

      const { data: students, error } = await query;
      if (error) throw error;
      if (!students || students.length === 0) {
        return JSON.stringify({ error: "No students found" });
      }

      // Get tasks for each student to calculate actual progress
      const progressAnalysis = await Promise.all(
        students.map(async (student) => {
          // Get student's tasks
          const { data: tasks } = await supabase
            .from("tasks")
            .select("*")
            .eq("student_id", student.id);

          const totalTasks = tasks?.length || 0;
          const completedTasks =
            tasks?.filter((t) => t.status === "completed").length || 0;
          const taskProgress =
            totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          // Get upcoming deadlines
          const now = new Date();
          const { data: upcomingTasks } = await supabase
            .from("tasks")
            .select("*")
            .eq("student_id", student.id)
            .gte("due_date", now.toISOString())
            .neq("status", "completed")
            .order("due_date", { ascending: true })
            .limit(5);

          // Determine status
          let status: "on_track" | "needs_attention" | "at_risk" | "ahead";
          let priority: "high" | "medium" | "low";

          if (taskProgress >= 75) {
            status = "ahead";
            priority = "low";
          } else if (taskProgress >= thresholdBehind) {
            status = "on_track";
            priority = "low";
          } else if (taskProgress >= 25) {
            status = "needs_attention";
            priority = "medium";
          } else {
            status = "at_risk";
            priority = "high";
          }

          // Generate recommendations
          let recommendations: string[] = [];
          if (includeRecommendations) {
            if (status === "at_risk") {
              recommendations.push("Schedule urgent check-in meeting");
              recommendations.push("Review and reassign incomplete tasks");
              recommendations.push("Identify blockers and provide support");
            } else if (status === "needs_attention") {
              recommendations.push("Schedule follow-up within next week");
              recommendations.push("Check on recent task assignments");
            } else if (status === "ahead") {
              recommendations.push("Great progress! Consider advanced opportunities");
            }

            // Deadline-specific recommendations
            const urgentDeadlines = upcomingTasks?.filter((t) => {
              const dueDate = new Date(t.due_date);
              const daysUntil = Math.ceil(
                (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              return daysUntil <= 3;
            });

            if (urgentDeadlines && urgentDeadlines.length > 0) {
              recommendations.push(
                `${urgentDeadlines.length} deadline(s) within 3 days - prioritize immediately`
              );
            }
          }

          return {
            student: {
              id: student.id,
              name: `${student.first_name} ${student.last_name}`,
              email: student.email,
              graduation_year: student.graduation_year,
            },
            progress: {
              overall: student.application_progress || 0,
              taskCompletion: Math.round(taskProgress),
              totalTasks,
              completedTasks,
              pendingTasks: totalTasks - completedTasks,
            },
            status,
            priority,
            upcomingDeadlines: upcomingTasks?.length || 0,
            urgentDeadlines:
              upcomingTasks?.filter((t) => {
                const dueDate = new Date(t.due_date);
                const daysUntil = Math.ceil(
                  (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );
                return daysUntil <= 3;
              }).length || 0,
            recommendations,
          };
        })
      );

      // Sort by priority (high first)
      progressAnalysis.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Summary
      const summary = {
        totalStudents: progressAnalysis.length,
        atRisk: progressAnalysis.filter((s) => s.status === "at_risk").length,
        needsAttention: progressAnalysis.filter(
          (s) => s.status === "needs_attention"
        ).length,
        onTrack: progressAnalysis.filter((s) => s.status === "on_track").length,
        ahead: progressAnalysis.filter((s) => s.status === "ahead").length,
        averageProgress: Math.round(
          progressAnalysis.reduce((sum, s) => sum + s.progress.overall, 0) /
            progressAnalysis.length
        ),
      };

      return JSON.stringify({
        result: progressAnalysis,
        summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[track_application_progress] Error:", error);
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Tool 8: College Recommendations
 */
export const collegeRecommendationsTool = new DynamicStructuredTool({
  name: "college_recommendations",
  description:
    "Generate college recommendations based on student profile. Analyzes GPA, test scores, interests, and suggests target/reach/safety schools.",
  schema: z.object({
    studentId: z
      .string()
      .uuid()
      .describe("Student ID to generate recommendations for"),
    focusArea: z
      .enum(["academic", "financial", "geographic", "all"])
      .optional()
      .default("all")
      .describe("Focus area for recommendations"),
  }),
  func: async ({ studentId, focusArea = "all" }) => {
    try {
      const supabase = createAdminClient();

      // Get student info
      const { data: student, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (error || !student) {
        return JSON.stringify({ error: "Student not found" });
      }

      // Get student's current college list
      const { data: currentColleges } = await supabase
        .from("college_applications")
        .select("college_name, application_type, status")
        .eq("student_id", studentId);

      // Generate recommendations based on student profile
      const recommendations: Array<{
        category: "safety" | "target" | "reach";
        reason: string;
        considerations: string[];
      }> = [];

      const gpa = student.gpa_weighted || student.gpa_unweighted || 0;
      const satScore = student.sat_score || 0;
      const actScore = student.act_score || 0;

      // Safety schools (GPA > 3.0)
      if (gpa >= 3.0) {
        recommendations.push({
          category: "safety",
          reason: `Strong academic profile (GPA: ${gpa})`,
          considerations: [
            "Apply to 2-3 safety schools where your stats are above average",
            "Consider schools with 60%+ acceptance rates",
            "Look for merit scholarship opportunities",
          ],
        });
      }

      // Target schools
      if (gpa >= 3.5) {
        recommendations.push({
          category: "target",
          reason: "Competitive academic profile",
          considerations: [
            "Apply to 4-5 target schools that match your profile",
            "Focus on schools where you're in the middle 50% of admitted students",
            "Highlight unique extracurriculars and essays",
          ],
        });
      }

      // Reach schools
      if (gpa >= 3.7 && (satScore >= 1400 || actScore >= 30)) {
        recommendations.push({
          category: "reach",
          reason: "Exceptional academic credentials",
          considerations: [
            "Apply to 2-3 reach schools (highly selective)",
            "Invest extra time in supplemental essays",
            "Showcase unique perspective and achievements",
          ],
        });
      }

      // Financial considerations
      if (focusArea === "financial" || focusArea === "all") {
        recommendations.push({
          category: "target",
          reason: "Financial aid opportunities",
          considerations: [
            "Research schools with strong financial aid programs",
            "Complete FAFSA and CSS Profile early",
            "Look for automatic merit scholarships",
            "Consider in-state public universities for cost savings",
          ],
        });
      }

      // Geographic diversity
      if (focusArea === "geographic" || focusArea === "all") {
        recommendations.push({
          category: "target",
          reason: "Geographic diversity",
          considerations: [
            "Consider schools in different regions for unique experiences",
            "Out-of-state students may have advantage at some public schools",
            "Research climate, culture, and distance from home",
          ],
        });
      }

      // Application strategy
      const currentCount = currentColleges?.length || 0;
      let strategyAdvice: string[] = [];

      if (currentCount === 0) {
        strategyAdvice.push("Start by adding 8-12 colleges to your list");
        strategyAdvice.push("Balance: 2-3 safety, 4-5 target, 2-3 reach schools");
      } else if (currentCount < 5) {
        strategyAdvice.push("Consider adding more schools for a balanced list");
      } else if (currentCount > 15) {
        strategyAdvice.push("You may have too many schools - focus on top choices");
      } else {
        strategyAdvice.push("Good college list size - ensure it's balanced");
      }

      return JSON.stringify({
        student: {
          name: `${student.first_name} ${student.last_name}`,
          gpa,
          satScore,
          actScore,
          currentColleges: currentCount,
        },
        recommendations,
        strategyAdvice,
        nextSteps: [
          "Review recommendations with counselor",
          "Research specific schools online",
          "Visit campuses if possible",
          "Start drafting college essays",
          "Prepare application materials",
        ],
      });
    } catch (error) {
      console.error("[college_recommendations] Error:", error);
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Tool 9: Smart Task Creator
 */
export const smartTaskCreatorTool = new DynamicStructuredTool({
  name: "smart_task_creator",
  description:
    "Generate smart task suggestions with intelligent defaults. Analyzes student context and suggests relevant tasks with appropriate deadlines, priorities, and descriptions.",
  schema: z.object({
    studentId: z.string().uuid().describe("Student ID to create tasks for"),
    taskType: z
      .enum([
        "essay",
        "application",
        "test_prep",
        "recommendation",
        "interview",
        "visit",
        "financial_aid",
        "general",
      ])
      .describe("Type of task to create"),
    collegeName: z.string().optional().describe("College name if relevant"),
    dueDate: z.string().optional().describe("Specific due date if known"),
  }),
  func: async ({ studentId, taskType, collegeName, dueDate }) => {
    try {
      const supabase = createAdminClient();

      // Get student info
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (!student) {
        return JSON.stringify({ error: "Student not found" });
      }

      // Generate smart defaults based on task type
      let taskSuggestions: Array<{
        title: string;
        description: string;
        priority: "high" | "medium" | "low";
        estimatedDays: number;
        category: string;
        tips: string[];
      }> = [];

      const now = new Date();

      switch (taskType) {
        case "essay":
          taskSuggestions = [
            {
              title: collegeName
                ? `${collegeName} - Common App Essay`
                : "Common Application Essay",
              description:
                "Draft and revise personal statement (650 words max). Focus on unique story and personal growth.",
              priority: "high",
              estimatedDays: 21,
              category: "essays",
              tips: [
                "Start with brainstorming session",
                "Create outline before writing",
                "Get feedback from 2-3 people",
                "Allow time for multiple revisions",
              ],
            },
            {
              title: collegeName
                ? `${collegeName} - Supplemental Essays`
                : "Supplemental Essays",
              description:
                "Research and draft college-specific supplemental essays.",
              priority: "high",
              estimatedDays: 14,
              category: "essays",
              tips: [
                "Research college thoroughly",
                "Address 'Why this college?' specifically",
                "Show genuine interest and fit",
              ],
            },
          ];
          break;

        case "application":
          taskSuggestions = [
            {
              title: collegeName
                ? `Submit ${collegeName} Application`
                : "Complete College Application",
              description:
                "Fill out application form, review for accuracy, and submit before deadline.",
              priority: "high",
              estimatedDays: 7,
              category: "applications",
              tips: [
                "Gather all materials first",
                "Double-check dates and names",
                "Submit 2-3 days before deadline",
                "Keep confirmation emails",
              ],
            },
          ];
          break;

        case "test_prep":
          taskSuggestions = [
            {
              title: "SAT/ACT Test Preparation",
              description: "Complete practice tests and review weak areas.",
              priority: "high",
              estimatedDays: 30,
              category: "testing",
              tips: [
                "Take full-length practice tests",
                "Review mistakes thoroughly",
                "Focus on time management",
                "Consider prep course if needed",
              ],
            },
          ];
          break;

        case "recommendation":
          taskSuggestions = [
            {
              title: "Request Letter of Recommendation",
              description: `Ask teacher/counselor for recommendation letter${collegeName ? ` for ${collegeName}` : ""}.`,
              priority: "high",
              estimatedDays: 21,
              category: "recommendations",
              tips: [
                "Ask recommenders at least 3 weeks in advance",
                "Provide resume and context",
                "Send thank-you note after submission",
              ],
            },
          ];
          break;

        case "interview":
          taskSuggestions = [
            {
              title: collegeName
                ? `${collegeName} Interview Preparation`
                : "College Interview Prep",
              description:
                "Research college, prepare answers to common questions, and practice.",
              priority: "medium",
              estimatedDays: 7,
              category: "interviews",
              tips: [
                "Research college thoroughly",
                "Prepare questions to ask interviewer",
                "Practice with someone",
                "Dress professionally",
              ],
            },
          ];
          break;

        case "visit":
          taskSuggestions = [
            {
              title: collegeName ? `Visit ${collegeName}` : "Campus Visit",
              description: "Schedule and attend campus tour and info session.",
              priority: "low",
              estimatedDays: 14,
              category: "visits",
              tips: [
                "Book tour in advance",
                "Prepare questions for students/staff",
                "Take notes during visit",
                "Demonstrate interest",
              ],
            },
          ];
          break;

        case "financial_aid":
          taskSuggestions = [
            {
              title: "Complete FAFSA",
              description: "Submit Free Application for Federal Student Aid.",
              priority: "high",
              estimatedDays: 14,
              category: "financial_aid",
              tips: [
                "Gather tax documents",
                "Complete as soon as possible after October 1",
                "Use IRS Data Retrieval Tool",
                "List all colleges you're applying to",
              ],
            },
            {
              title: "Complete CSS Profile",
              description:
                "Submit CSS Profile for institutional aid (if required).",
              priority: "high",
              estimatedDays: 14,
              category: "financial_aid",
              tips: [
                "Check which colleges require CSS",
                "More detailed than FAFSA",
                "Requires fee (waivers available)",
              ],
            },
          ];
          break;

        default:
          taskSuggestions = [
            {
              title: collegeName
                ? `${collegeName} - College Application Task`
                : "College Application Task",
              description: "General task for college application process.",
              priority: "medium",
              estimatedDays: 7,
              category: "general",
              tips: ["Break down into smaller steps", "Set interim deadlines"],
            },
          ];
      }

      // Add calculated due dates
      const suggestionsWithDates = taskSuggestions.map((suggestion) => {
        const suggestedDueDate = new Date(now);
        suggestedDueDate.setDate(
          suggestedDueDate.getDate() + suggestion.estimatedDays
        );

        return {
          ...suggestion,
          suggestedDueDate:
            dueDate || suggestedDueDate.toISOString().split("T")[0],
          studentName: `${student.first_name} ${student.last_name}`,
        };
      });

      return JSON.stringify({
        student: {
          id: studentId,
          name: `${student.first_name} ${student.last_name}`,
        },
        taskType,
        collegeName,
        suggestions: suggestionsWithDates,
        message: `Generated ${suggestionsWithDates.length} task suggestion(s). Review and confirm to create.`,
      });
    } catch (error) {
      console.error("[smart_task_creator] Error:", error);
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Tool 10: Generate Recommendation Letter (with NLP name resolution)
 */
export const generateRecommendationLetterTool = new DynamicStructuredTool({
  name: "generate_recommendation_letter",
  description: `Generate a professional Letter of Recommendation for a student.

  **ACCEPTS NAMES - NO ID NEEDED!**
  You can provide:
  - Full name: "John Smith"
  - First name only: "Sarah"
  - Last name only: "Johnson"
  - Partial name: "Em" (finds Emma, Emily, etc.)

  The tool will automatically search for matching students and generate a personalized letter.

  Examples:
  - "Generate a letter for Sarah" → finds Sarah, creates letter
  - "Write rec letter for Johnson" → finds student with last name Johnson
  - "Create letter for the student with 3.9 GPA" → use student_id if you have it from previous search`,

  schema: z.object({
    student_name: z
      .string()
      .optional()
      .describe("Student's first name, last name, or full name - flexible!"),
    student_id: z
      .string()
      .uuid()
      .optional()
      .describe("Student ID if you already have it from a search"),
    college_name: z
      .string()
      .optional()
      .describe("Target college for the letter"),
    program: z
      .string()
      .optional()
      .describe("Specific program/major the student is applying to"),
    highlights: z
      .array(z.string())
      .optional()
      .describe("Specific achievements or qualities to emphasize"),
  }),

  func: async ({
    student_name,
    student_id,
    college_name,
    program,
    highlights,
  }) => {
    try {
      const supabase = createAdminClient();
      let student: any = null;

      // Smart student resolution - find by name OR ID
      if (student_id) {
        const { data } = await supabase
          .from("students")
          .select("*")
          .eq("id", student_id)
          .single();
        student = data;
      } else if (student_name) {
        // Use NLP to extract and parse student name intelligently
        const nameInfo = extractStudentName(student_name);
        console.log("[Letter Generator] NLP extracted name:", nameInfo);

        // Build intelligent search query based on extracted name components
        let query = supabase.from("students").select("*");

        // Sanitize search terms - remove EVERYTHING except alphanumeric and spaces
        const cleanTerm = (term: string) => {
          return term.trim().replace(/[^a-zA-Z0-9\s]/g, ""); // Keep only alphanumeric and spaces
        };

        try {
          if (nameInfo.firstName && nameInfo.lastName) {
            // Full name provided - search both first and last
            const encodedFirst = cleanTerm(nameInfo.firstName);
            const encodedLast = cleanTerm(nameInfo.lastName);
            query = query.or(
              `first_name.ilike.%${encodedFirst}%,last_name.ilike.%${encodedLast}%`
            );
          } else if (nameInfo.searchTerm) {
            // Partial name - fuzzy search
            const encodedTerm = cleanTerm(nameInfo.searchTerm);
            query = query.or(
              `first_name.ilike.%${encodedTerm}%,last_name.ilike.%${encodedTerm}%`
            );
          } else {
            // Fallback to original search term
            const encodedName = cleanTerm(student_name);
            query = query.or(
              `first_name.ilike.%${encodedName}%,last_name.ilike.%${encodedName}%`
            );
          }
        } catch (error) {
          console.warn(
            "[Letter Generator] Query failed, will filter client-side:",
            error
          );
          // Don't apply filter, fetch all and filter client-side
        }

        const { data: students } = await query.limit(20);

        // Client-side filtering for more robust matching
        let matchedStudents = students || [];

        if (matchedStudents.length > 0) {
          // Sanitize search term for client-side filtering
          let searchTerm = (nameInfo.searchTerm || student_name)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ""); // Keep only alphanumeric and spaces

          // Filter and rank by relevance
          matchedStudents = matchedStudents
            .filter((s) => {
              const firstName = s.first_name?.toLowerCase() || "";
              const lastName = s.last_name?.toLowerCase() || "";
              const fullName = `${firstName} ${lastName}`;

              return (
                firstName.includes(searchTerm) ||
                lastName.includes(searchTerm) ||
                fullName.includes(searchTerm)
              );
            })
            .sort((a, b) => {
              // Prioritize exact matches
              const aFirst = a.first_name?.toLowerCase() || "";
              const aLast = a.last_name?.toLowerCase() || "";
              const bFirst = b.first_name?.toLowerCase() || "";
              const bLast = b.last_name?.toLowerCase() || "";

              if (aFirst === searchTerm || aLast === searchTerm) return -1;
              if (bFirst === searchTerm || bLast === searchTerm) return 1;
              return 0;
            });
        }

        if (matchedStudents && matchedStudents.length > 0) {
          if (matchedStudents.length === 1) {
            student = matchedStudents[0];
          } else {
            // Multiple matches - return list for user to clarify
            return JSON.stringify({
              success: false,
              multiple_matches: true,
              students: matchedStudents.slice(0, 5).map((s) => ({
                id: s.id,
                name: `${s.first_name} ${s.last_name}`,
                email: s.email,
                gpa: s.gpa,
              })),
              message: `Found ${matchedStudents.length} students matching "${student_name}". Please be more specific or use student_id.`,
            });
          }
        }
      }

      if (!student) {
        return JSON.stringify({
          success: false,
          error: "Student not found",
          message: student_name
            ? `Could not find a student named "${student_name}". Try a different spelling or use get_students to search first.`
            : "Please provide either student_name or student_id",
        });
      }

      // Generate personalized letter using AI with high-reasoning model
      const llm = createLLMForGeneration({
        temperature: 0.7, // Higher for creative, personalized writing
        maxTokens: 1500,
        hasPII: true, // Student data is PII
      });

      const prompt = `Generate a professional Letter of Recommendation for:

Student: ${student.first_name} ${student.last_name}
GPA: ${student.gpa || "N/A"}
SAT: ${student.sat_score || "N/A"}
ACT: ${student.act_score || "N/A"}
Email: ${student.email}
Graduation Year: ${student.graduation_year || "N/A"}
${college_name ? `Target College: ${college_name}` : ""}
${program ? `Program: ${program}` : ""}
${highlights ? `Key Highlights: ${highlights.join(", ")}` : ""}

Write a compelling, personalized letter that:
1. Introduces the student and your relationship
2. Highlights their academic strengths and character
3. Provides specific examples of their achievements
4. Concludes with a strong recommendation
5. Uses professional tone appropriate for college admissions

Format as a formal letter with proper structure.`;

      const response = await llm.invoke(prompt);
      const letterContent =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // Save letter to database
      const { data: savedLetter, error: saveError } = await supabase
        .from("letters_of_recommendation")
        .insert({
          student_id: student.id,
          counselor_id: student.counselor_id || "00000000-0000-0000-0000-000000000000", // Use default if not set
          program_type: program || null,
          generated_content: letterContent,
          status: "draft",
        })
        .select()
        .single();

      if (saveError || !savedLetter) {
        console.error("[Letter Generator] Error saving letter:", saveError);
        // Still return the letter content even if save fails
        return JSON.stringify({
          success: true,
          student: {
            name: `${student.first_name} ${student.last_name}`,
            email: student.email,
            gpa: student.gpa,
          },
          letter: letterContent,
          college: college_name,
          program: program,
          message: `Generated recommendation letter for ${student.first_name} ${student.last_name}${college_name ? ` for ${college_name}` : ""}. (Warning: Letter was not saved to database)`,
        });
      }

      // Return with canvas marker to open in canvas
      return JSON.stringify({
        success: true,
        __canvas__: {
          type: "letter",
          action: "open",
          data: {
            letter_id: savedLetter.id,
            student_id: student.id,
            student_name: `${student.first_name} ${student.last_name}`,
            program_type: program,
            word_count: letterContent.trim().split(/\s+/).filter(Boolean).length,
            status: "draft",
          }
        },
        letter_id: savedLetter.id,
        student: {
          name: `${student.first_name} ${student.last_name}`,
          email: student.email,
          gpa: student.gpa,
        },
        letter: letterContent,
        college: college_name,
        program: program,
        message: `Generated recommendation letter for ${student.first_name} ${student.last_name}${college_name ? ` for ${college_name}` : ""}. Opening in canvas editor...`,
      });
    } catch (error) {
      console.error("[Letter Generator] Error:", error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate letter",
      });
    }
  },
});

/**
 * Tool 11: Natural Language Search
 */
export const naturalLanguageSearchTool = new DynamicStructuredTool({
  name: "natural_language_search",
  description: `Intelligent search using natural language. Understands complex queries and extracts entities automatically.

  **Understands queries like:**
  - "Find students with GPA above 3.5"
  - "Show me Sarah's information"
  - "Students graduating in 2025 who applied to MIT"
  - "Find the student with SAT score 1400"

  Automatically extracts: names, GPAs, test scores, graduation years, colleges, and more.`,

  schema: z.object({
    query: z
      .string()
      .describe("Natural language query describing what you're looking for"),
  }),

  func: async ({ query }) => {
    try {
      const supabase = createAdminClient();

      // Use NLP to extract all entities and intent from the query
      const searchQuery = buildSearchQuery(query);
      const entities = extractEntities(query);

      console.log("[NLP Search] Extracted entities:", entities);
      console.log("[NLP Search] Built search query:", searchQuery);

      // Build database query based on extracted information
      let dbQuery = supabase.from("students").select("*");

      // Apply student name filter
      if (searchQuery.studentSearch) {
        // Sanitize - remove EVERYTHING except letters, numbers, and spaces
        let searchTerm = searchQuery.studentSearch
          .trim()
          .replace(/[^a-zA-Z0-9\s]/g, ""); // Keep only alphanumeric and spaces

        console.log(
          "[NLP Search] Original:",
          searchQuery.studentSearch,
          "Sanitized:",
          searchTerm
        );

        if (searchTerm) {
          try {
            dbQuery = dbQuery.or(
              `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
            );
          } catch (error) {
            console.warn(
              "[NLP Search] Query failed, will filter client-side:",
              error
            );
          }
        }
      }

      // Apply GPA filters
      if (searchQuery.filters?.gpa) {
        dbQuery = dbQuery.eq("gpa", searchQuery.filters.gpa);
      }
      if (searchQuery.filters?.minGPA) {
        dbQuery = dbQuery.gte("gpa", searchQuery.filters.minGPA);
      }
      if (searchQuery.filters?.maxGPA) {
        dbQuery = dbQuery.lte("gpa", searchQuery.filters.maxGPA);
      }

      // Apply graduation year filter
      if (searchQuery.filters?.graduationYear) {
        dbQuery = dbQuery.eq(
          "graduation_year",
          searchQuery.filters.graduationYear
        );
      }

      // Execute search
      const { data: students, error } = await dbQuery.limit(50);

      if (error) throw error;

      // Additional client-side filtering if needed
      let filteredStudents = students || [];

      if (searchQuery.studentSearch && filteredStudents.length > 0) {
        let searchTerm = searchQuery.studentSearch
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ""); // Keep only alphanumeric and spaces

        // Refine with client-side filtering
        filteredStudents = filteredStudents.filter((s) => {
          const firstName = s.first_name?.toLowerCase() || "";
          const lastName = s.last_name?.toLowerCase() || "";
          const fullName = `${firstName} ${lastName}`;
          const email = s.email?.toLowerCase() || "";

          return (
            firstName.includes(searchTerm) ||
            lastName.includes(searchTerm) ||
            fullName.includes(searchTerm) ||
            email.includes(searchTerm)
          );
        });
      }

      if (!filteredStudents || filteredStudents.length === 0) {
        return JSON.stringify({
          success: false,
          message: `No students found matching: "${query}"`,
          extractedInfo: {
            intent: searchQuery.intent,
            filters: searchQuery.filters,
            entities,
          },
          suggestion: "Try being more specific or check spelling",
        });
      }

      // Format results (limit after filtering)
      const formattedResults = filteredStudents.slice(0, 20).map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        email: s.email,
        gpa: s.gpa,
        sat_score: s.sat_score,
        act_score: s.act_score,
        graduation_year: s.graduation_year,
        application_progress: s.application_progress,
      }));

      return JSON.stringify({
        success: true,
        query,
        results: formattedResults,
        count: formattedResults.length,
        extractedInfo: {
          intent: searchQuery.intent,
          filters: searchQuery.filters,
          entities: {
            people: entities.people,
            colleges: entities.colleges,
            numbers: entities.numbers,
            dates: entities.dates,
          },
        },
        message: `Found ${formattedResults.length} student(s) matching your query`,
      });
    } catch (error) {
      console.error("[NLP Search] Error:", error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      });
    }
  },
});

/**
 * Tool 12: Intelligent Essay Search with NLP
 */
export const intelligentEssaySearchTool = new DynamicStructuredTool({
  name: "search_essays_nlp",
  description: `Search for student essays using natural language.

  **Understands queries like:**
  - "Show me Sarah's Common App essay"
  - "Find essays for students applying to MIT"
  - "Get the essay about overcoming challenges"

  Automatically extracts student names, essay types, topics, and colleges.`,

  schema: z.object({
    query: z
      .string()
      .describe(
        "Natural language description of what essay you're looking for"
      ),
  }),

  func: async ({ query }) => {
    try {
      const supabase = createAdminClient();

      // Extract entities from query
      const entities = extractEntities(query);
      const nameInfo = extractStudentName(query);
      const collegeInfo = extractCollegeInfo(query);

      console.log("[Essay NLP Search] Entities:", entities);
      console.log("[Essay NLP Search] Name:", nameInfo);
      console.log("[Essay NLP Search] College:", collegeInfo);

      // Build essay search query
      let essayQuery = supabase.from("essays").select(`
          *,
          students!inner(id, first_name, last_name, email)
        `);

      // Search by student name if provided
      if (nameInfo.searchTerm) {
        // Sanitize the search term - remove EVERYTHING except letters, numbers, and spaces
        let searchTerm = nameInfo.searchTerm
          .trim()
          .replace(/[^a-zA-Z0-9\s]/g, ""); // Keep only alphanumeric and spaces

        console.log(
          "[Essay Search] Original:",
          nameInfo.searchTerm,
          "Sanitized:",
          searchTerm
        );

        if (searchTerm) {
          try {
            // Use Supabase's filter syntax with sanitized term
            essayQuery = essayQuery.or(
              `students.first_name.ilike.%${searchTerm}%,students.last_name.ilike.%${searchTerm}%`
            );
          } catch (error) {
            // Fallback: fetch all and filter client-side
            console.warn(
              "[Essay Search] Query builder failed, using client-side filtering:",
              error
            );
            // Don't apply the filter, we'll filter client-side later
          }
        }
      }

      // Search by college if mentioned
      if (collegeInfo.college) {
        essayQuery = essayQuery.ilike("college_name", `%${collegeInfo.college}%`);
      }

      // Detect essay type from query
      const lowerQuery = query.toLowerCase();
      if (
        lowerQuery.includes("common app") ||
        lowerQuery.includes("personal statement")
      ) {
        essayQuery = essayQuery.eq("essay_type", "common_app");
      } else if (
        lowerQuery.includes("supplemental") ||
        lowerQuery.includes("why")
      ) {
        essayQuery = essayQuery.eq("essay_type", "supplemental");
      }

      const { data: essays, error } = await essayQuery.limit(50); // Fetch more for client-side filtering

      if (error) throw error;

      // Client-side filtering as fallback or additional filtering
      let filteredEssays = essays || [];

      if (nameInfo.searchTerm && filteredEssays.length > 0) {
        // Sanitize search term for client-side filtering - remove everything except alphanumeric
        let searchTerm = nameInfo.searchTerm
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ""); // Keep only alphanumeric and spaces

        // Filter client-side for more flexible matching
        filteredEssays = filteredEssays.filter((e: any) => {
          if (!e.students) return false;
          const firstName = e.students.first_name?.toLowerCase() || "";
          const lastName = e.students.last_name?.toLowerCase() || "";
          const fullName = `${firstName} ${lastName}`;

          // Match if search term is in first name, last name, or full name
          return (
            firstName.includes(searchTerm) ||
            lastName.includes(searchTerm) ||
            fullName.includes(searchTerm)
          );
        });
      }

      if (filteredEssays.length === 0) {
        return JSON.stringify({
          success: false,
          message: `No essays found matching: "${query}"`,
          extractedInfo: {
            studentName: nameInfo,
            college: collegeInfo,
            entities,
          },
          suggestion: nameInfo.searchTerm
            ? `Try searching with just the first or last name without possessives (e.g., "${nameInfo.searchTerm.replace(/['']s$/i, "")}")`
            : "Try being more specific about the student or essay you're looking for",
        });
      }

      // Format results (limit to 10 after filtering)
      const formattedEssays = filteredEssays.slice(0, 10).map((e: any) => ({
        id: e.id,
        student: {
          id: e.students.id,
          name: `${e.students.first_name} ${e.students.last_name}`,
        },
        essay_type: e.essay_type,
        college_name: e.college_name,
        prompt: e.prompt,
        status: e.status,
        word_count: e.content?.split(" ").length || 0,
      }));

      return JSON.stringify({
        success: true,
        query,
        results: formattedEssays,
        count: essays.length,
        extractedInfo: {
          studentName: nameInfo,
          college: collegeInfo,
          topics: entities.topics,
        },
        message: `Found ${essays.length} essay(s) matching your query`,
      });
    } catch (error) {
      console.error("[Essay NLP Search] Error:", error);
      return JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Essay search failed",
      });
    }
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Basic Query Tools (6 tools)
 * Used for simple student/task queries
 */
export const langchainTools = [
  getStudentsTool,
  getStudentsByApplicationTypeTool,
  getStudentTool,
  getTasksTool,
  getTaskTool,
  getUpcomingDeadlinesTool,
];

/**
 * Enhanced Tools (6 tools)
 * Advanced features: progress tracking, recommendations, NLP search, letter generation
 */
export const enhancedTools = [
  trackApplicationProgressTool,
  collegeRecommendationsTool,
  smartTaskCreatorTool,
  generateRecommendationLetterTool,
  naturalLanguageSearchTool,
  intelligentEssaySearchTool,
];

/**
 * All Tools Combined (12 tools)
 * Use this for maximum functionality
 */
export const allTools = [...langchainTools, ...enhancedTools];

/**
 * Legacy exports for backwards compatibility
 * These maintain the old aiTools format
 */
export const aiTools = langchainTools.map((tool) => ({
  type: "function" as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.schema.shape,
  },
}));

/**
 * Legacy executeTool function for backwards compatibility
 * Wraps the new tool execution model
 */
export async function executeTool(
  toolCall: { id: string; name: string; arguments: string | Record<string, any> },
  userId: string
) {
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

  // Find the tool
  const tool = allTools.find((t) => t.name === toolCall.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  // Execute the tool
  const resultString = await tool.func(args as any);
  const result = JSON.parse(resultString);

  return {
    toolCallId: toolCall.id,
    name: toolCall.name,
    result,
  };
}
