/**
 * LLM-Powered Insight Generation Service
 * Generates actionable insights for college counselors using real AI analysis
 */

import { createLLM } from "./llm-factory";
import { getStudentsTool, getTasksTool, getUpcomingDeadlinesTool } from "./tools";
import { createAdminClient } from "@/lib/supabase/admin";

export interface GeneratedInsight {
  category: "deadline" | "progress" | "essay" | "risk" | "lor" | "success";
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
  related_data: {
    student_ids?: string[];
    task_ids?: string[];
    deadline_date?: string;
  };
  confidence_score?: number;
}

export interface InsightGenerationOptions {
  counselorId: string;
  category?: "deadline" | "progress" | "essay" | "risk" | "all";
  maxInsights?: number;
  temperature?: number;
}

/**
 * Generate AI-powered insights for a counselor
 */
export async function generateInsightsForCounselor(
  options: InsightGenerationOptions
): Promise<GeneratedInsight[]> {
  const { counselorId, category = "all", maxInsights = 5, temperature = 0.3 } = options;

  try {
    console.log(`[Insight Generator] Starting generation for counselor ${counselorId}, category: ${category}`);

    // 1. Gather data using consolidated tools
    const [studentsResult, tasksResult, upcomingDeadlinesResult] = await Promise.all([
      getStudentsTool.func({}).catch((e) => {
        console.error("[Insight Generator] Error fetching students:", e);
        return JSON.stringify({ students: [], count: 0 });
      }),
      getTasksTool.func({}).catch((e) => {
        console.error("[Insight Generator] Error fetching tasks:", e);
        return JSON.stringify({ tasks: [], count: 0 });
      }),
      getUpcomingDeadlinesTool.func({ days: 14 }).catch((e) => {
        console.error("[Insight Generator] Error fetching upcoming deadlines:", e);
        return JSON.stringify({ tasks: [], count: 0 });
      }),
    ]);

    // Parse results
    const studentsData = JSON.parse(studentsResult);
    const tasksData = JSON.parse(tasksResult);
    const upcomingData = JSON.parse(upcomingDeadlinesResult);

    const students = studentsData.students || [];
    const tasks = tasksData.tasks || [];
    const upcomingDeadlines = upcomingData.tasks || [];

    console.log(`[Insight Generator] Data fetched: ${students.length} students, ${tasks.length} tasks, ${upcomingDeadlines.length} upcoming deadlines`);

    // 2. Build context-rich prompt based on category
    const prompt = buildInsightPrompt(category, students, tasks, upcomingDeadlines, maxInsights);

    // 3. Get LLM response
    const llm = createLLM({ temperature, maxTokens: 2000 });
    console.log("[Insight Generator] Calling LLM...");

    const response = await llm.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

    console.log("[Insight Generator] LLM response received, parsing...");

    // 4. Parse and validate insights
    const insights = parseInsightsFromLLM(content, students, tasks);

    console.log(`[Insight Generator] Generated ${insights.length} insights`);

    // 5. Save to database
    if (insights.length > 0) {
      await saveInsightsToDatabase(insights, counselorId);
      console.log("[Insight Generator] Insights saved to database");
    }

    return insights;
  } catch (error) {
    console.error("[Insight Generator] Error generating insights:", error);
    throw error;
  }
}

/**
 * Build context-rich prompt for LLM based on category
 */
function buildInsightPrompt(
  category: string,
  students: any[],
  tasks: any[],
  upcomingDeadlines: any[],
  maxInsights: number
): string {
  // Calculate key metrics
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== "completed"
  );
  const atRiskStudents = students.filter((s) => (s.application_progress || 0) < 30);
  const highPerformers = students.filter((s) => (s.application_progress || 0) >= 70);

  // Build category-specific focus
  let categoryFocus = "";
  switch (category) {
    case "deadline":
      categoryFocus = "Focus on deadline urgency, overlapping deadlines, and time management issues.";
      break;
    case "progress":
      categoryFocus = "Focus on student progress patterns, at-risk students, and completion rates.";
      break;
    case "essay":
      categoryFocus = "Focus on essay status, review bottlenecks, and writing support needs.";
      break;
    case "risk":
      categoryFocus = "Focus on students at risk of falling behind, missed deadlines, and intervention needs.";
      break;
    default:
      categoryFocus = "Analyze all aspects: deadlines, student progress, risks, and opportunities.";
  }

  const prompt = `You are an expert college application counselor analyzing student and task data.

**DATA SUMMARY:**
- Total Students: ${students.length}
- At Risk (< 30% progress): ${atRiskStudents.length}
- High Performers (≥ 70% progress): ${highPerformers.length}
- Total Tasks: ${tasks.length}
- Overdue Tasks: ${overdueTasks.length}
- Upcoming Deadlines (14 days): ${upcomingDeadlines.length}

**DETAILED DATA:**

Students (showing key info):
${students.slice(0, 20).map((s, i) =>
  `${i + 1}. ID: ${s.id}, Name: ${s.first_name} ${s.last_name}, Progress: ${s.application_progress || 0}%, GPA: ${s.gpa_unweighted || "N/A"}, Year: ${s.graduation_year}`
).join("\n")}
${students.length > 20 ? `... and ${students.length - 20} more students` : ""}

Upcoming Deadlines:
${upcomingDeadlines.slice(0, 15).map((t, i) =>
  `${i + 1}. "${t.title}" - Due: ${t.due_date}, Priority: ${t.priority}, Student: ${t.student_id}, Status: ${t.status}`
).join("\n")}
${upcomingDeadlines.length > 15 ? `... and ${upcomingDeadlines.length - 15} more deadlines` : ""}

${overdueTasks.length > 0 ? `
Overdue Tasks (URGENT):
${overdueTasks.slice(0, 10).map((t, i) =>
  `${i + 1}. "${t.title}" - Due: ${t.due_date}, Priority: ${t.priority}, Student: ${t.student_id}`
).join("\n")}
${overdueTasks.length > 10 ? `... and ${overdueTasks.length - 10} more overdue` : ""}
` : ""}

**YOUR TASK:**
${categoryFocus}

Identify ${maxInsights} actionable insights that would be most valuable for a college counselor right now.

**IMPORTANT RULES:**
1. Be specific - reference actual student names/IDs and task titles
2. Prioritize urgency - deadlines approaching, students at risk
3. Provide actionable recommendations - what should the counselor DO
4. Focus on patterns, not isolated incidents (unless high priority)
5. Consider realistic workload - don't overwhelm with too many students

**OUTPUT FORMAT (JSON ONLY):**
Return a JSON array of insights. Each insight must have:
- category: "deadline" | "progress" | "essay" | "risk" | "lor" | "success"
- priority: "high" | "medium" | "low"
- finding: Clear description of what you noticed (be specific!)
- recommendation: Actionable advice (what to do next)
- related_data: { student_ids: [array of IDs], task_ids: [array if applicable], deadline_date: "YYYY-MM-DD if relevant" }
- confidence_score: 0.0-1.0 (how confident are you in this insight)

Example:
[
  {
    "category": "deadline",
    "priority": "high",
    "finding": "3 students (Sarah Chen, Michael Brown, Emma Wilson) have overlapping college application deadlines on Nov 18th, including MIT EA and Stanford SCEA.",
    "recommendation": "Schedule individual check-ins this week to review completion status and prioritize which applications to submit first if not all can be completed.",
    "related_data": {
      "student_ids": ["uuid1", "uuid2", "uuid3"],
      "task_ids": ["task-uuid1", "task-uuid2"],
      "deadline_date": "2024-11-18"
    },
    "confidence_score": 0.95
  }
]

**GENERATE ${maxInsights} INSIGHTS NOW (JSON ARRAY ONLY, NO OTHER TEXT):**`;

  return prompt;
}

/**
 * Parse insights from LLM response
 */
function parseInsightsFromLLM(
  content: string,
  students: any[],
  tasks: any[]
): GeneratedInsight[] {
  try {
    // Try to extract JSON from the response
    let jsonContent = content.trim();

    // Remove markdown code blocks if present
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/```\n?/g, "").trim();
    }

    // Try to find JSON array in the content
    const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonContent);
    const insights: GeneratedInsight[] = Array.isArray(parsed) ? parsed : [parsed];

    // Validate and filter insights
    return insights
      .filter((insight) => {
        return (
          insight.finding &&
          insight.recommendation &&
          insight.category &&
          insight.priority
        );
      })
      .map((insight) => ({
        category: insight.category,
        priority: insight.priority,
        finding: insight.finding,
        recommendation: insight.recommendation,
        related_data: insight.related_data || {},
        confidence_score: insight.confidence_score || 0.8,
      }));
  } catch (error) {
    console.error("[Insight Generator] Error parsing LLM response:", error);
    console.error("[Insight Generator] Content was:", content);

    // Return fallback insight
    return [
      {
        category: "progress",
        priority: "medium",
        finding: "Unable to generate detailed insights at this time due to parsing error.",
        recommendation: "Please try refreshing insights or check the system logs.",
        related_data: {},
        confidence_score: 0.5,
      },
    ];
  }
}

/**
 * Save insights to database
 */
async function saveInsightsToDatabase(
  insights: GeneratedInsight[],
  counselorId: string
): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Prepare insights for database insertion
    const insightsToInsert = insights.map((insight) => ({
      counselor_id: counselorId,
      category: insight.category,
      priority: insight.priority,
      finding: insight.finding,
      recommendation: insight.recommendation,
      related_data: insight.related_data,
      status: "active",
      confidence_score: insight.confidence_score,
      created_at: new Date().toISOString(),
    }));

    // Insert insights
    const { error } = await supabase
      .from("agent_insights")
      .insert(insightsToInsert);

    if (error) {
      console.error("[Insight Generator] Error saving to database:", error);
      throw error;
    }

    console.log(`[Insight Generator] Successfully saved ${insights.length} insights to database`);
  } catch (error) {
    console.error("[Insight Generator] Database save failed:", error);
    throw error;
  }
}

/**
 * Get last generation timestamp for rate limiting
 */
export async function getLastGenerationTime(counselorId: string): Promise<Date | null> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("agent_insights")
      .select("created_at")
      .eq("counselor_id", counselorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return new Date(data.created_at);
  } catch (error) {
    console.error("[Insight Generator] Error fetching last generation time:", error);
    return null;
  }
}

/**
 * Check if enough time has passed since last generation (rate limiting)
 */
export async function canGenerateInsights(
  counselorId: string,
  minimumMinutes: number = 60
): Promise<boolean> {
  const lastGeneration = await getLastGenerationTime(counselorId);

  if (!lastGeneration) return true; // Never generated before

  const now = new Date();
  const minutesSinceLastGeneration = (now.getTime() - lastGeneration.getTime()) / (1000 * 60);

  return minutesSinceLastGeneration >= minimumMinutes;
}
