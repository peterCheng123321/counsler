/**
 * Enhanced LangChain Tools for Phase 2
 * Advanced capabilities: progress tracking, college research, smart task creation
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";

/**
 * Application Progress Tracker
 * Analyzes student progress and identifies who needs attention
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
  func: async ({ studentId, thresholdBehind, includeRecommendations }) => {
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
        needsAttention: progressAnalysis.filter((s) => s.status === "needs_attention")
          .length,
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
 * College Research and Recommendations
 * Helps find colleges that match student profile
 */
export const collegeRecommendationsTool = new DynamicStructuredTool({
  name: "college_recommendations",
  description:
    "Generate college recommendations based on student profile. Analyzes GPA, test scores, interests, and suggests target/reach/safety schools.",
  schema: z.object({
    studentId: z.string().uuid().describe("Student ID to generate recommendations for"),
    focusArea: z
      .enum(["academic", "financial", "geographic", "all"])
      .optional()
      .default("all")
      .describe("Focus area for recommendations"),
  }),
  func: async ({ studentId, focusArea }) => {
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
 * Smart Task Creator with Defaults
 * Creates tasks with intelligent defaults based on context
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
              description: "Research and draft college-specific supplemental essays.",
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
              description: "Research college, prepare answers to common questions, and practice.",
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
              description: "Submit CSS Profile for institutional aid (if required).",
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
        suggestedDueDate.setDate(suggestedDueDate.getDate() + suggestion.estimatedDays);

        return {
          ...suggestion,
          suggestedDueDate: dueDate || suggestedDueDate.toISOString().split("T")[0],
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
 * Export all enhanced tools
 */
export const enhancedTools = [
  trackApplicationProgressTool,
  collegeRecommendationsTool,
  smartTaskCreatorTool,
];
