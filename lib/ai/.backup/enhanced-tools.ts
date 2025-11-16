/**
 * Enhanced LangChain Tools for Phase 2
 * Advanced capabilities: progress tracking, college research, smart task creation, letter generation
 * Now with integrated Natural Language Processing
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_USER_ID } from "@/lib/constants";
import { createLLM } from "./llm-factory";
import {
  extractStudentName,
  extractCollegeInfo,
  extractGPA,
  extractTestScores,
  buildSearchQuery,
  extractEntities,
} from "@/lib/nlp/entity-extractor";

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
 * INTELLIGENT Letter of Recommendation Generator
 * Accepts student NAME (first, last, or full) - no ID required!
 * Automatically finds the student and generates personalized letter
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
    student_name: z.string().optional().describe("Student's first name, last name, or full name - flexible!"),
    student_id: z.string().uuid().optional().describe("Student ID if you already have it from a search"),
    college_name: z.string().optional().describe("Target college for the letter"),
    program: z.string().optional().describe("Specific program/major the student is applying to"),
    highlights: z.array(z.string()).optional().describe("Specific achievements or qualities to emphasize"),
  }),

  func: async ({ student_name, student_id, college_name, program, highlights }) => {
    try {
      const supabase = createAdminClient();
      let student: any = null;

      // Smart student resolution - find by name OR ID
      if (student_id) {
        const { data } = await supabase.from("students").select("*").eq("id", student_id).single();
        student = data;
      } else if (student_name) {
        // Use NLP to extract and parse student name intelligently
        const nameInfo = extractStudentName(student_name);
        console.log("[Letter Generator] NLP extracted name:", nameInfo);

        // Build intelligent search query based on extracted name components
        let query = supabase.from("students").select("*");

        // Sanitize search terms - remove EVERYTHING except alphanumeric and spaces
        const cleanTerm = (term: string) => {
          return term
            .trim()
            .replace(/[^a-zA-Z0-9\s]/g, ''); // Keep only alphanumeric and spaces
        };

        try {
          if (nameInfo.firstName && nameInfo.lastName) {
            // Full name provided - search both first and last
            const encodedFirst = cleanTerm(nameInfo.firstName);
            const encodedLast = cleanTerm(nameInfo.lastName);
            query = query.or(`first_name.ilike.%${encodedFirst}%,last_name.ilike.%${encodedLast}%`);
          } else if (nameInfo.searchTerm) {
            // Partial name - fuzzy search
            const encodedTerm = cleanTerm(nameInfo.searchTerm);
            query = query.or(`first_name.ilike.%${encodedTerm}%,last_name.ilike.%${encodedTerm}%`);
          } else {
            // Fallback to original search term
            const encodedName = cleanTerm(student_name);
            query = query.or(`first_name.ilike.%${encodedName}%,last_name.ilike.%${encodedName}%`);
          }
        } catch (error) {
          console.warn("[Letter Generator] Query failed, will filter client-side:", error);
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
            .replace(/[^a-z0-9\s]/g, ''); // Keep only alphanumeric and spaces

          // Filter and rank by relevance
          matchedStudents = matchedStudents
            .filter((s) => {
              const firstName = s.first_name?.toLowerCase() || '';
              const lastName = s.last_name?.toLowerCase() || '';
              const fullName = `${firstName} ${lastName}`;

              return firstName.includes(searchTerm) ||
                     lastName.includes(searchTerm) ||
                     fullName.includes(searchTerm);
            })
            .sort((a, b) => {
              // Prioritize exact matches
              const aFirst = a.first_name?.toLowerCase() || '';
              const aLast = a.last_name?.toLowerCase() || '';
              const bFirst = b.first_name?.toLowerCase() || '';
              const bLast = b.last_name?.toLowerCase() || '';

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
              students: matchedStudents.slice(0, 5).map(s => ({
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

      // Generate personalized letter using AI
      const llm = createLLM({ temperature: 0.7, maxTokens: 1500 });

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
      const letterContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

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
        message: `Generated recommendation letter for ${student.first_name} ${student.last_name}${college_name ? ` for ${college_name}` : ""}`,
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
 * INTELLIGENT Natural Language Search
 * Accepts complex natural language queries and extracts all relevant information
 * Uses NLP to understand context and find students
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
    query: z.string().describe("Natural language query describing what you're looking for"),
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
          .replace(/[^a-zA-Z0-9\s]/g, ''); // Keep only alphanumeric and spaces

        console.log("[NLP Search] Original:", searchQuery.studentSearch, "Sanitized:", searchTerm);

        if (searchTerm) {
          try {
            dbQuery = dbQuery.or(
              `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
            );
          } catch (error) {
            console.warn("[NLP Search] Query failed, will filter client-side:", error);
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
        dbQuery = dbQuery.eq("graduation_year", searchQuery.filters.graduationYear);
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
          .replace(/[^a-z0-9\s]/g, ''); // Keep only alphanumeric and spaces

        // Refine with client-side filtering
        filteredStudents = filteredStudents.filter((s) => {
          const firstName = s.first_name?.toLowerCase() || '';
          const lastName = s.last_name?.toLowerCase() || '';
          const fullName = `${firstName} ${lastName}`;
          const email = s.email?.toLowerCase() || '';

          return firstName.includes(searchTerm) ||
                 lastName.includes(searchTerm) ||
                 fullName.includes(searchTerm) ||
                 email.includes(searchTerm);
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
 * INTELLIGENT Essay Search with NLP
 * Find essays using natural language descriptions
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
    query: z.string().describe("Natural language description of what essay you're looking for"),
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
      let essayQuery = supabase
        .from("essays")
        .select(`
          *,
          students!inner(id, first_name, last_name, email)
        `);

      // Search by student name if provided
      if (nameInfo.searchTerm) {
        // Sanitize the search term - remove EVERYTHING except letters, numbers, and spaces
        let searchTerm = nameInfo.searchTerm
          .trim()
          .replace(/[^a-zA-Z0-9\s]/g, ''); // Keep only alphanumeric and spaces

        console.log("[Essay Search] Original:", nameInfo.searchTerm, "Sanitized:", searchTerm);

        if (searchTerm) {
          try {
            // Use Supabase's filter syntax with sanitized term
            essayQuery = essayQuery.or(
              `students.first_name.ilike.%${searchTerm}%,students.last_name.ilike.%${searchTerm}%`
            );
          } catch (error) {
            // Fallback: fetch all and filter client-side
            console.warn("[Essay Search] Query builder failed, using client-side filtering:", error);
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
      if (lowerQuery.includes("common app") || lowerQuery.includes("personal statement")) {
        essayQuery = essayQuery.eq("essay_type", "common_app");
      } else if (lowerQuery.includes("supplemental") || lowerQuery.includes("why")) {
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
          .replace(/[^a-z0-9\s]/g, ''); // Keep only alphanumeric and spaces

        // Filter client-side for more flexible matching
        filteredEssays = filteredEssays.filter((e: any) => {
          if (!e.students) return false;
          const firstName = e.students.first_name?.toLowerCase() || '';
          const lastName = e.students.last_name?.toLowerCase() || '';
          const fullName = `${firstName} ${lastName}`;

          // Match if search term is in first name, last name, or full name
          return firstName.includes(searchTerm) ||
                 lastName.includes(searchTerm) ||
                 fullName.includes(searchTerm);
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
            ? `Try searching with just the first or last name without possessives (e.g., "${nameInfo.searchTerm.replace(/['']s$/i, '')}")`
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
        error: error instanceof Error ? error.message : "Essay search failed",
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
  generateRecommendationLetterTool,
  naturalLanguageSearchTool,
  intelligentEssaySearchTool,
];
