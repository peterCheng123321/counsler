/**
 * LangChain Analytics Tools for Autonomous Agent
 * These tools enable data analysis, insights generation, and proactive monitoring
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Calculate statistics across students or tasks
 * Autonomous - no confirmation needed
 */
export const calculateStatisticsTool = new DynamicStructuredTool({
  name: "calculate_statistics",
  description:
    "Calculate statistics and aggregations across students or tasks. Use this to get averages, counts, distributions, and other metrics. Examples: 'average GPA of students', 'task completion rate', 'students by graduation year'",
  schema: z.object({
    entityType: z
      .enum(["students", "tasks"])
      .describe("Type of entity to analyze"),
    metric: z
      .enum([
        "count",
        "average",
        "median",
        "min",
        "max",
        "distribution",
        "completion_rate",
      ])
      .describe("Statistical metric to calculate"),
    field: z
      .string()
      .optional()
      .describe(
        "Field to calculate metric on (e.g., 'gpa_weighted', 'application_progress', 'status')"
      ),
    filters: z
      .object({
        graduationYear: z.number().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        progressMin: z.number().optional(),
        progressMax: z.number().optional(),
      })
      .optional()
      .describe("Optional filters to apply before calculating"),
  }),
  func: async ({ entityType, metric, field, filters }) => {
    try {
      const supabase = await createClient();

      if (entityType === "students") {
        let query = supabase.from("students").select("*");

        // Apply filters
        if (filters?.graduationYear) {
          query = query.eq("graduation_year", filters.graduationYear);
        }
        if (filters?.progressMin !== undefined) {
          query = query.gte("application_progress", filters.progressMin);
        }
        if (filters?.progressMax !== undefined) {
          query = query.lte("application_progress", filters.progressMax);
        }

        const { data: students, error } = await query;
        if (error) throw error;
        if (!students || students.length === 0) {
          return JSON.stringify({ result: 0, message: "No students found" });
        }

        // Calculate metrics
        switch (metric) {
          case "count":
            return JSON.stringify({ result: students.length, students });

          case "average":
            if (!field) {
              return JSON.stringify({
                error: "Field is required for average metric",
              });
            }
            const values = students
              .map((s) => s[field])
              .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)))
              .map(Number);
            const avg =
              values.length > 0
                ? values.reduce((a, b) => a + b, 0) / values.length
                : 0;
            return JSON.stringify({
              result: Math.round(avg * 100) / 100,
              field,
              sampleSize: values.length,
            });

          case "distribution":
            if (!field) {
              return JSON.stringify({
                error: "Field is required for distribution metric",
              });
            }
            const distribution: Record<string, number> = {};
            students.forEach((s) => {
              const value = String(s[field] ?? "null");
              distribution[value] = (distribution[value] || 0) + 1;
            });
            return JSON.stringify({
              result: distribution,
              field,
              totalCount: students.length,
            });

          case "min":
          case "max":
            if (!field) {
              return JSON.stringify({
                error: `Field is required for ${metric} metric`,
              });
            }
            const nums = students
              .map((s) => s[field])
              .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)))
              .map(Number);
            const result = metric === "min" ? Math.min(...nums) : Math.max(...nums);
            return JSON.stringify({ result, field });

          default:
            return JSON.stringify({ error: "Unsupported metric for students" });
        }
      } else if (entityType === "tasks") {
        let query = supabase.from("tasks").select("*");

        // Apply filters
        if (filters?.status) {
          query = query.eq("status", filters.status);
        }
        if (filters?.priority) {
          query = query.eq("priority", filters.priority);
        }

        const { data: tasks, error } = await query;
        if (error) throw error;
        if (!tasks || tasks.length === 0) {
          return JSON.stringify({ result: 0, message: "No tasks found" });
        }

        // Calculate metrics
        switch (metric) {
          case "count":
            return JSON.stringify({ result: tasks.length, tasks });

          case "completion_rate":
            const completed = tasks.filter((t) => t.status === "completed").length;
            const rate = (completed / tasks.length) * 100;
            return JSON.stringify({
              result: Math.round(rate * 100) / 100,
              completed,
              total: tasks.length,
            });

          case "distribution":
            if (!field) {
              return JSON.stringify({
                error: "Field is required for distribution metric",
              });
            }
            const distribution: Record<string, number> = {};
            tasks.forEach((t) => {
              const value = String(t[field] ?? "null");
              distribution[value] = (distribution[value] || 0) + 1;
            });
            return JSON.stringify({
              result: distribution,
              field,
              totalCount: tasks.length,
            });

          default:
            return JSON.stringify({ error: "Unsupported metric for tasks" });
        }
      }

      return JSON.stringify({ error: "Unknown entity type" });
    } catch (error) {
      console.error("[calculate_statistics] Error:", error);
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Analyze trends over time
 * Autonomous - no confirmation needed
 */
export const trendAnalysisTool = new DynamicStructuredTool({
  name: "trend_analysis",
  description:
    "Analyze trends over time for students or tasks. Identifies patterns, growth rates, and changes. Examples: 'task completion trend this month', 'student progress over last 30 days'",
  schema: z.object({
    entityType: z
      .enum(["students", "tasks"])
      .describe("Type of entity to analyze"),
    metric: z
      .string()
      .describe(
        "Metric to track (e.g., 'application_progress', 'task_completion', 'status')"
      ),
    timeRange: z
      .enum(["7d", "30d", "90d", "1y"])
      .optional()
      .default("30d")
      .describe("Time range for trend analysis"),
    groupBy: z
      .enum(["day", "week", "month"])
      .optional()
      .default("week")
      .describe("How to group the data points"),
  }),
  func: async ({ entityType, metric, timeRange, groupBy }) => {
    try {
      const supabase = await createClient();

      // Calculate date range
      const now = new Date();
      const daysBack =
        timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);

      if (entityType === "tasks") {
        // Analyze task trends
        const { data: tasks, error } = await supabase
          .from("tasks")
          .select("*")
          .gte("created_at", startDate.toISOString());

        if (error) throw error;
        if (!tasks || tasks.length === 0) {
          return JSON.stringify({ result: [], message: "No tasks in time range" });
        }

        // Group by time period
        const trends: Record<
          string,
          { completed: number; pending: number; total: number }
        > = {};

        tasks.forEach((task) => {
          const date = new Date(task.created_at);
          let key: string;

          if (groupBy === "day") {
            key = date.toISOString().split("T")[0];
          } else if (groupBy === "week") {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split("T")[0];
          } else {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          }

          if (!trends[key]) {
            trends[key] = { completed: 0, pending: 0, total: 0 };
          }

          trends[key].total++;
          if (task.status === "completed") {
            trends[key].completed++;
          } else {
            trends[key].pending++;
          }
        });

        // Convert to array and calculate completion rate
        const trendArray = Object.entries(trends)
          .map(([date, data]) => ({
            date,
            ...data,
            completionRate: Math.round((data.completed / data.total) * 100),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate trend direction
        const firstRate = trendArray[0]?.completionRate || 0;
        const lastRate = trendArray[trendArray.length - 1]?.completionRate || 0;
        const trendDirection =
          lastRate > firstRate ? "improving" : lastRate < firstRate ? "declining" : "stable";

        return JSON.stringify({
          result: trendArray,
          summary: {
            timeRange,
            groupBy,
            dataPoints: trendArray.length,
            trendDirection,
            change: lastRate - firstRate,
          },
        });
      } else if (entityType === "students") {
        // For students, we can analyze progress changes
        // Note: This requires historical data which might not exist yet
        // For now, return current snapshot grouped by progress levels
        const { data: students, error } = await supabase.from("students").select("*");

        if (error) throw error;
        if (!students || students.length === 0) {
          return JSON.stringify({ result: [], message: "No students found" });
        }

        // Group by progress level
        const progressDistribution = {
          "0-25%": 0,
          "26-50%": 0,
          "51-75%": 0,
          "76-100%": 0,
        };

        students.forEach((student) => {
          const progress = student.application_progress || 0;
          if (progress <= 25) progressDistribution["0-25%"]++;
          else if (progress <= 50) progressDistribution["26-50%"]++;
          else if (progress <= 75) progressDistribution["51-75%"]++;
          else progressDistribution["76-100%"]++;
        });

        return JSON.stringify({
          result: progressDistribution,
          summary: {
            totalStudents: students.length,
            averageProgress: Math.round(
              students.reduce((sum, s) => sum + (s.application_progress || 0), 0) /
                students.length
            ),
          },
        });
      }

      return JSON.stringify({ error: "Unknown entity type" });
    } catch (error) {
      console.error("[trend_analysis] Error:", error);
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Generate AI-powered insights from data
 * Autonomous - no confirmation needed
 */
export const generateInsightsTool = new DynamicStructuredTool({
  name: "generate_insights",
  description:
    "Generate AI-powered insights, patterns, and recommendations from analysis results. Takes raw data and extracts actionable insights. Use after other analytics tools to interpret results.",
  schema: z.object({
    analysisResults: z
      .string()
      .describe("JSON string of analysis results from other tools"),
    context: z
      .string()
      .optional()
      .describe("Additional context about what to focus on"),
  }),
  func: async ({ analysisResults, context }) => {
    try {
      // Parse the analysis results
      const data = JSON.parse(analysisResults);

      // Generate insights based on the data
      const insights: Array<{
        category: string;
        priority: "high" | "medium" | "low";
        finding: string;
        recommendation: string;
      }> = [];

      // Example insight generation logic
      // In production, this could use an LLM to generate more sophisticated insights
      if (data.completionRate !== undefined) {
        const rate = data.completionRate;
        if (rate < 50) {
          insights.push({
            category: "productivity",
            priority: "high",
            finding: `Task completion rate is low at ${rate}%`,
            recommendation:
              "Review task assignments and deadlines. Consider breaking down complex tasks.",
          });
        } else if (rate > 80) {
          insights.push({
            category: "productivity",
            priority: "low",
            finding: `Excellent task completion rate of ${rate}%`,
            recommendation: "Maintain current workflow and consider increasing capacity.",
          });
        }
      }

      if (data.averageProgress !== undefined) {
        const progress = data.averageProgress;
        if (progress < 40) {
          insights.push({
            category: "student_progress",
            priority: "high",
            finding: `Average student progress is ${progress}%, below target`,
            recommendation:
              "Schedule check-ins with students to identify blockers and provide support.",
          });
        }
      }

      if (data.trendDirection === "declining") {
        insights.push({
          category: "trends",
          priority: "high",
          finding: "Performance trend is declining",
          recommendation:
            "Investigate root causes and implement corrective actions immediately.",
        });
      } else if (data.trendDirection === "improving") {
        insights.push({
          category: "trends",
          priority: "low",
          finding: "Performance trend is improving",
          recommendation: "Document successful practices for replication.",
        });
      }

      return JSON.stringify({
        insights,
        totalInsights: insights.length,
        highPriority: insights.filter((i) => i.priority === "high").length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[generate_insights] Error:", error);
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Monitor upcoming deadlines proactively
 * Autonomous - no confirmation needed
 */
export const deadlineMonitorTool = new DynamicStructuredTool({
  name: "deadline_monitor",
  description:
    "Proactively monitor upcoming deadlines and identify potential conflicts or risks. Returns priority-ordered list of deadlines with recommendations. Use for daily/weekly deadline checks.",
  schema: z.object({
    daysAhead: z
      .number()
      .optional()
      .default(7)
      .describe("Number of days ahead to monitor (default 7)"),
    priority: z
      .enum(["high", "medium", "low", "all"])
      .optional()
      .default("all")
      .describe("Filter by priority level"),
  }),
  func: async ({ daysAhead, priority }) => {
    try {
      const supabase = await createClient();

      // Calculate date range
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + daysAhead);

      let query = supabase
        .from("tasks")
        .select("*")
        .gte("due_date", now.toISOString().split("T")[0])
        .lte("due_date", futureDate.toISOString().split("T")[0])
        .neq("status", "completed")
        .order("due_date", { ascending: true });

      if (priority !== "all") {
        query = query.eq("priority", priority);
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      if (!tasks || tasks.length === 0) {
        return JSON.stringify({
          result: [],
          message: "No upcoming deadlines",
        });
      }

      // Analyze deadlines
      const deadlines = tasks.map((task) => {
        const dueDate = new Date(task.due_date);
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        let urgency: "critical" | "urgent" | "moderate" = "moderate";
        let recommendation = "";

        if (daysUntilDue <= 1) {
          urgency = "critical";
          recommendation = "Immediate attention required - deadline within 24 hours";
        } else if (daysUntilDue <= 3) {
          urgency = "urgent";
          recommendation = "Priority action needed - deadline approaching soon";
        } else {
          urgency = "moderate";
          recommendation = "Schedule work time before deadline";
        }

        return {
          ...task,
          daysUntilDue,
          urgency,
          recommendation,
        };
      });

      // Group by urgency
      const critical = deadlines.filter((d) => d.urgency === "critical");
      const urgent = deadlines.filter((d) => d.urgency === "urgent");
      const moderate = deadlines.filter((d) => d.urgency === "moderate");

      return JSON.stringify({
        result: deadlines,
        summary: {
          total: deadlines.length,
          critical: critical.length,
          urgent: urgent.length,
          moderate: moderate.length,
          daysAhead,
        },
        recommendations: [
          ...(critical.length > 0
            ? [
                `${critical.length} critical deadline(s) - immediate action required`,
              ]
            : []),
          ...(urgent.length > 0
            ? [`${urgent.length} urgent deadline(s) - prioritize soon`]
            : []),
        ],
      });
    } catch (error) {
      console.error("[deadline_monitor] Error:", error);
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Export all analytics tools
 */
export const analyticsTools = [
  calculateStatisticsTool,
  trendAnalysisTool,
  generateInsightsTool,
  deadlineMonitorTool,
];
