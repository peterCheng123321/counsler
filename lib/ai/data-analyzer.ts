/**
 * AI-Powered Data Analyzer
 * Feeds data from visualizations and tables to AI agent for actual analysis
 */

import { runLangGraphAgent } from "./langgraph-agent";
import { HumanMessage } from "@langchain/core/messages";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AnalysisRequest {
  dataType: "students" | "tasks" | "progress" | "deadlines" | "custom";
  data: any;
  context?: string;
  focusAreas?: string[];
}

export interface AnalysisResult {
  summary: string;
  insights: {
    category: string;
    priority: "high" | "medium" | "low";
    finding: string;
    recommendation: string;
    dataPoints?: string[];
  }[];
  trends: {
    direction: "improving" | "declining" | "stable";
    metric: string;
    details: string;
  }[];
  actionItems: {
    priority: "high" | "medium" | "low";
    action: string;
    rationale: string;
    estimatedImpact: string;
  }[];
  rawResponse: string;
}

/**
 * Analyze student distribution data
 */
export async function analyzeStudentData(
  students: any[],
  focusAreas?: string[]
): Promise<AnalysisResult> {
  const supabase = createAdminClient();

  // Enrich with task data for better analysis
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .in(
      "student_id",
      students.map((s) => s.id)
    );

  // Calculate statistics
  const stats = {
    total: students.length,
    byGraduationYear: students.reduce((acc, s) => {
      const year = s.graduation_year || "Unknown";
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    avgProgress:
      students.reduce((sum, s) => sum + (s.application_progress || 0), 0) /
      students.length,
    byProgressLevel: {
      ahead: students.filter((s) => s.application_progress >= 75).length,
      onTrack: students.filter(
        (s) => s.application_progress >= 40 && s.application_progress < 75
      ).length,
      behind: students.filter(
        (s) => s.application_progress >= 20 && s.application_progress < 40
      ).length,
      atRisk: students.filter((s) => s.application_progress < 20).length,
    },
    avgGPA: students
      .filter((s) => s.gpa_weighted || s.gpa_unweighted)
      .reduce(
        (sum, s) => sum + (s.gpa_weighted || s.gpa_unweighted || 0),
        0
      ) / students.filter((s) => s.gpa_weighted || s.gpa_unweighted).length,
  };

  // Build analysis prompt
  const prompt = `As a college counseling analytics expert, analyze this student data and provide actionable insights.

**Dataset Summary:**
- Total Students: ${stats.total}
- Average Progress: ${stats.avgProgress.toFixed(1)}%
- Average GPA: ${stats.avgGPA.toFixed(2)}
- Students Ahead: ${stats.byProgressLevel.ahead}
- Students On Track: ${stats.byProgressLevel.onTrack}
- Students Behind: ${stats.byProgressLevel.behind}
- Students At Risk: ${stats.byProgressLevel.atRisk}

**Distribution by Graduation Year:**
${Object.entries(stats.byGraduationYear)
  .map(([year, count]) => `- ${year}: ${count} students`)
  .join("\n")}

${focusAreas && focusAreas.length > 0 ? `**Focus Areas:**\n${focusAreas.map((area) => `- ${area}`).join("\n")}\n` : ""}

**Detailed Student Data:**
${JSON.stringify(
  students.map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    year: s.graduation_year,
    progress: s.application_progress,
    gpa: s.gpa_weighted || s.gpa_unweighted,
    intendedMajor: s.intended_major,
    collegesCount: Array.isArray(s.colleges) ? s.colleges.length : 0,
  })),
  null,
  2
)}

**Instructions:**
1. Identify key trends and patterns
2. Highlight students/groups that need attention
3. Provide specific, actionable recommendations
4. Suggest interventions for at-risk students
5. Identify best practices from successful students
6. Recommend resource allocation priorities

Format your response with:
- Executive Summary (2-3 sentences)
- Top Insights (3-5 key findings with priority levels)
- Trends Analysis
- Action Items (prioritized list of what to do)`;

  const result = await runLangGraphAgent(
    prompt,
    [],
    `data_analysis_students_${Date.now()}`
  );

  return parseAnalysisResponse(result.response, result.insights);
}

/**
 * Analyze task and deadline data
 */
export async function analyzeTaskData(
  tasks: any[],
  focusAreas?: string[]
): Promise<AnalysisResult> {
  // Calculate statistics
  const now = new Date();
  const stats = {
    total: tasks.length,
    byStatus: {
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    },
    byPriority: {
      high: tasks.filter((t) => t.priority === "high").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      low: tasks.filter((t) => t.priority === "low").length,
    },
    overdue: tasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.due_date &&
        new Date(t.due_date) < now
    ).length,
    dueThisWeek: tasks.filter((t) => {
      if (!t.due_date || t.status === "completed") return false;
      const dueDate = new Date(t.due_date);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= weekFromNow;
    }).length,
    byCategory: tasks.reduce((acc, t) => {
      const cat = t.category || "uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  const completionRate = (stats.byStatus.completed / stats.total) * 100;

  const prompt = `As a task management and productivity expert, analyze this task data and provide actionable insights for college counselors.

**Dataset Summary:**
- Total Tasks: ${stats.total}
- Completion Rate: ${completionRate.toFixed(1)}%
- Overdue Tasks: ${stats.overdue} (${((stats.overdue / stats.total) * 100).toFixed(1)}%)
- Due This Week: ${stats.dueThisWeek}

**Status Distribution:**
- Pending: ${stats.byStatus.pending}
- In Progress: ${stats.byStatus.inProgress}
- Completed: ${stats.byStatus.completed}

**Priority Distribution:**
- High Priority: ${stats.byPriority.high}
- Medium Priority: ${stats.byPriority.medium}
- Low Priority: ${stats.byPriority.low}

**Category Distribution:**
${Object.entries(stats.byCategory)
  .map(([cat, count]) => `- ${cat}: ${count} tasks`)
  .join("\n")}

${focusAreas && focusAreas.length > 0 ? `**Focus Areas:**\n${focusAreas.map((area) => `- ${area}`).join("\n")}\n` : ""}

**Detailed Task Data:**
${JSON.stringify(
  tasks
    .filter((t) => t.status !== "completed")
    .slice(0, 20) // Limit to prevent token overflow
    .map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      studentName: t.student_name,
    })),
  null,
  2
)}

**Instructions:**
1. Assess workflow health and bottlenecks
2. Identify overdue/at-risk tasks requiring immediate attention
3. Analyze workload distribution and balance
4. Recommend task prioritization strategy
5. Suggest process improvements
6. Identify capacity issues

Provide:
- Executive Summary
- Critical Issues (high priority items)
- Workflow Analysis
- Actionable Recommendations`;

  const result = await runLangGraphAgent(
    prompt,
    [],
    `data_analysis_tasks_${Date.now()}`
  );

  return parseAnalysisResponse(result.response, result.insights);
}

/**
 * Analyze progress trends over time
 */
export async function analyzeProgressTrends(
  timelineData: Array<{ name: string; [key: string]: any }>,
  context: string = "weekly"
): Promise<AnalysisResult> {
  const prompt = `As a data analyst specializing in educational progress tracking, analyze this timeline data and identify trends.

**Timeline Data (${context}):**
${JSON.stringify(timelineData, null, 2)}

**Instructions:**
1. Identify upward/downward trends in each metric
2. Spot anomalies or unusual patterns
3. Compare performance across time periods
4. Predict potential future issues based on trends
5. Recommend interventions based on patterns

Provide:
- Trend Summary
- Key Patterns Identified
- Predictions/Warnings
- Recommended Actions`;

  const result = await runLangGraphAgent(
    prompt,
    [],
    `data_analysis_trends_${Date.now()}`
  );

  return parseAnalysisResponse(result.response, result.insights);
}

/**
 * Analyze deadline distribution and urgency
 */
export async function analyzeDeadlines(
  deadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    studentName?: string;
  }>
): Promise<AnalysisResult> {
  const now = new Date();
  const grouped = deadlines.reduce(
    (acc, d) => {
      const dueDate = new Date(d.dueDate);
      const daysUntil = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil < 0) acc.overdue.push(d);
      else if (daysUntil === 0) acc.today.push(d);
      else if (daysUntil <= 3) acc.urgent.push(d);
      else if (daysUntil <= 7) acc.thisWeek.push(d);
      else acc.upcoming.push(d);

      return acc;
    },
    {
      overdue: [] as any[],
      today: [] as any[],
      urgent: [] as any[],
      thisWeek: [] as any[],
      upcoming: [] as any[],
    }
  );

  const prompt = `As a deadline management expert, analyze this deadline distribution and provide recommendations.

**Deadline Summary:**
- Overdue: ${grouped.overdue.length} deadlines
- Due Today: ${grouped.today.length} deadlines
- Urgent (1-3 days): ${grouped.urgent.length} deadlines
- This Week (4-7 days): ${grouped.thisWeek.length} deadlines
- Upcoming (7+ days): ${grouped.upcoming.length} deadlines

**Critical Deadlines (Overdue + Today + Urgent):**
${JSON.stringify(
  [...grouped.overdue, ...grouped.today, ...grouped.urgent].map((d) => ({
    title: d.title,
    dueDate: d.dueDate,
    priority: d.priority,
    student: d.studentName,
  })),
  null,
  2
)}

**Instructions:**
1. Assess urgency and identify conflicts
2. Recommend prioritization order
3. Identify students with too many concurrent deadlines
4. Suggest deadline extensions or adjustments
5. Highlight resource allocation needs

Provide specific, time-sensitive recommendations.`;

  const result = await runLangGraphAgent(
    prompt,
    [],
    `data_analysis_deadlines_${Date.now()}`
  );

  return parseAnalysisResponse(result.response, result.insights);
}

/**
 * Parse AI response into structured analysis result
 */
function parseAnalysisResponse(
  response: string,
  existingInsights?: any[]
): AnalysisResult {
  // Extract summary (first paragraph)
  const summary =
    response.split("\n\n")[0] || "Analysis completed successfully.";

  // Try to parse structured insights from response
  const insights: AnalysisResult["insights"] = existingInsights || [];

  // Look for trend indicators
  const trends: AnalysisResult["trends"] = [];
  const trendKeywords = {
    improving: ["improv", "increas", "better", "progress", "upward"],
    declining: ["declin", "decreas", "worse", "drop", "downward"],
    stable: ["stable", "maintain", "consistent", "steady"],
  };

  for (const [direction, keywords] of Object.entries(trendKeywords)) {
    for (const keyword of keywords) {
      if (response.toLowerCase().includes(keyword)) {
        // Extract context around keyword
        const index = response.toLowerCase().indexOf(keyword);
        const context = response.substring(
          Math.max(0, index - 50),
          Math.min(response.length, index + 100)
        );

        trends.push({
          direction: direction as any,
          metric: "Overall",
          details: context.trim(),
        });
        break; // Only one trend per direction
      }
    }
  }

  // Extract action items (look for numbered lists or bullet points)
  const actionItems: AnalysisResult["actionItems"] = [];
  const actionRegex =
    /(?:^|\n)\s*(?:\d+\.|-|\*)\s*(.+?)(?=\n|$)/gm;
  let match;

  while ((match = actionRegex.exec(response)) !== null && actionItems.length < 5) {
    const action = match[1].trim();
    if (action.length > 10) {
      // Filter out very short matches
      const priority = action.toLowerCase().includes("urgent") ||
        action.toLowerCase().includes("immediate")
        ? "high"
        : action.toLowerCase().includes("consider") ||
            action.toLowerCase().includes("should")
          ? "medium"
          : "low";

      actionItems.push({
        priority,
        action,
        rationale: "Based on AI analysis of current data",
        estimatedImpact: priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low",
      });
    }
  }

  return {
    summary,
    insights,
    trends,
    actionItems,
    rawResponse: response,
  };
}
