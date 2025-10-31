/**
 * Pre-built workflow templates for common automation tasks
 */

import type { WorkflowStep } from "./workflow-executor";

export interface WorkflowTemplate {
  name: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
  triggerType: "manual" | "scheduled" | "event";
}

/**
 * Template: Find At-Risk Students and Create Check-in Tasks
 * Queries students with low progress, filters at-risk ones, creates tasks
 */
export const atRiskStudentWorkflow: WorkflowTemplate = {
  name: "Monitor At-Risk Students",
  description: "Find students with low progress and automatically create check-in tasks",
  category: "student_monitoring",
  triggerType: "scheduled",
  steps: [
    {
      id: "query_students",
      name: "Query All Students",
      type: "query",
      config: {
        table: "students",
        select: "*",
        filters: {},
      },
    },
    {
      id: "filter_at_risk",
      name: "Filter At-Risk Students (Progress < 30%)",
      type: "filter",
      config: {
        sourceStepId: "query_students",
        conditions: {
          application_progress: {
            operator: "lt",
            value: 30,
          },
        },
      },
      dependsOn: ["query_students"],
    },
    {
      id: "analyze_students",
      name: "AI Analysis of At-Risk Students",
      type: "ai_analyze",
      config: {
        sourceStepId: "filter_at_risk",
        prompt: "Analyze these at-risk students and provide specific recommendations for each. Focus on their progress, deadlines, and what actions would help most.",
      },
      dependsOn: ["filter_at_risk"],
    },
    {
      id: "create_check_in_tasks",
      name: "Create Check-in Tasks",
      type: "create",
      config: {
        table: "tasks",
        records: [
          {
            student_id: "{{filter_at_risk.data.0.id}}",
            title: "Urgent: Check-in with at-risk student",
            description: "Student is significantly behind on application progress. Schedule meeting to discuss barriers and create action plan.",
            category: "meeting",
            priority: "high",
            status: "pending",
            due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          },
        ],
      },
      dependsOn: ["filter_at_risk"],
    },
  ],
};

/**
 * Template: Weekly Deadline Check
 * Finds tasks due this week, analyzes them, sends summary
 */
export const weeklyDeadlineWorkflow: WorkflowTemplate = {
  name: "Weekly Deadline Review",
  description: "Analyze upcoming deadlines for the week and generate priority recommendations",
  category: "deadline_monitoring",
  triggerType: "scheduled",
  steps: [
    {
      id: "query_upcoming_tasks",
      name: "Query Tasks Due This Week",
      type: "query",
      config: {
        table: "tasks",
        select: "*, students(first_name, last_name)",
        filters: {
          status: "pending",
        },
      },
    },
    {
      id: "filter_this_week",
      name: "Filter Tasks Due Within 7 Days",
      type: "filter",
      config: {
        sourceStepId: "query_upcoming_tasks",
        conditions: {
          due_date: {
            operator: "lte",
            value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
      dependsOn: ["query_upcoming_tasks"],
    },
    {
      id: "analyze_deadlines",
      name: "AI Analysis of Deadlines",
      type: "ai_analyze",
      config: {
        sourceStepId: "filter_this_week",
        prompt: "Analyze these upcoming deadlines. Identify: 1) Most urgent tasks, 2) Tasks that might conflict, 3) Students who need immediate attention. Provide a prioritized action plan.",
      },
      dependsOn: ["filter_this_week"],
    },
    {
      id: "notify_summary",
      name: "Send Weekly Summary",
      type: "notify",
      config: {
        message: "Weekly deadline summary generated. Check the dashboard for AI recommendations.",
        recipients: ["counselor"],
      },
      dependsOn: ["analyze_deadlines"],
    },
  ],
};

/**
 * Template: High-Achieving Student College Recommendations
 * Finds high GPA students, generates personalized college recommendations
 */
export const collegeRecommendationWorkflow: WorkflowTemplate = {
  name: "Generate College Recommendations",
  description: "Find high-achieving students and create personalized college recommendation tasks",
  category: "college_planning",
  triggerType: "manual",
  steps: [
    {
      id: "query_students",
      name: "Query All Students",
      type: "query",
      config: {
        table: "students",
        select: "*",
        filters: {},
      },
    },
    {
      id: "filter_high_achievers",
      name: "Filter High-Achieving Students (GPA > 3.7)",
      type: "filter",
      config: {
        sourceStepId: "query_students",
        conditions: {
          gpa_weighted: {
            operator: "gt",
            value: 3.7,
          },
        },
      },
      dependsOn: ["query_students"],
    },
    {
      id: "generate_recommendations",
      name: "AI College Recommendations",
      type: "ai_analyze",
      config: {
        sourceStepId: "filter_high_achievers",
        prompt: "For each student, generate personalized college recommendations considering their GPA, test scores, intended major, and interests. Categorize colleges as reach, target, and safety schools.",
      },
      dependsOn: ["filter_high_achievers"],
    },
    {
      id: "create_recommendation_tasks",
      name: "Create College Research Tasks",
      type: "create",
      config: {
        table: "tasks",
        records: [
          {
            student_id: "{{filter_high_achievers.data.0.id}}",
            title: "Research recommended colleges",
            description: "Review AI-generated college recommendations and research each school. Focus on: programs, campus culture, financial aid, and application requirements.",
            category: "research",
            priority: "medium",
            status: "pending",
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
          },
        ],
      },
      dependsOn: ["filter_high_achievers"],
    },
  ],
};

/**
 * Template: Application Progress Audit
 * Analyzes all students' progress, identifies issues, creates action items
 */
export const progressAuditWorkflow: WorkflowTemplate = {
  name: "Complete Progress Audit",
  description: "Comprehensive analysis of all students' application progress with automated action items",
  category: "analytics",
  triggerType: "manual",
  steps: [
    {
      id: "query_all_students",
      name: "Query All Students and Tasks",
      type: "query",
      config: {
        table: "students",
        select: "*",
        filters: {},
      },
    },
    {
      id: "query_all_tasks",
      name: "Query All Tasks",
      type: "query",
      config: {
        table: "tasks",
        select: "*",
        filters: {},
      },
    },
    {
      id: "analyze_progress",
      name: "AI Progress Analysis",
      type: "ai_analyze",
      config: {
        sourceStepId: "query_all_students",
        prompt: `Comprehensive progress audit:
1. Identify students ahead of schedule vs behind
2. Analyze task completion rates
3. Find patterns in delays or issues
4. Recommend specific interventions for each student group
5. Suggest process improvements

Provide actionable insights with priority levels.`,
      },
      dependsOn: ["query_all_students", "query_all_tasks"],
    },
    {
      id: "check_insights",
      name: "Check if Action Needed",
      type: "conditional",
      config: {
        sourceStepId: "analyze_progress",
        condition: {
          operator: "contains",
          expected: "high priority",
        },
      },
      dependsOn: ["analyze_progress"],
    },
    {
      id: "notify_results",
      name: "Send Audit Results",
      type: "notify",
      config: {
        message: "Progress audit complete. Review insights in the dashboard for recommended actions.",
        recipients: ["counselor"],
      },
      dependsOn: ["analyze_progress"],
    },
  ],
};

/**
 * Template: Overdue Task Escalation
 * Finds overdue tasks, updates priority, sends alerts
 */
export const overdueTaskWorkflow: WorkflowTemplate = {
  name: "Escalate Overdue Tasks",
  description: "Automatically escalate overdue tasks by updating priority and sending notifications",
  category: "task_management",
  triggerType: "scheduled",
  steps: [
    {
      id: "query_overdue",
      name: "Query Overdue Tasks",
      type: "query",
      config: {
        table: "tasks",
        select: "*, students(first_name, last_name)",
        filters: {
          status: "pending",
        },
      },
    },
    {
      id: "filter_overdue",
      name: "Filter Tasks Past Due Date",
      type: "filter",
      config: {
        sourceStepId: "query_overdue",
        conditions: {
          due_date: {
            operator: "lt",
            value: new Date().toISOString(),
          },
        },
      },
      dependsOn: ["query_overdue"],
    },
    {
      id: "check_count",
      name: "Check if Overdue Tasks Exist",
      type: "conditional",
      config: {
        sourceStepId: "filter_overdue",
        field: "count",
        condition: {
          operator: "gt",
          expected: 0,
        },
      },
      dependsOn: ["filter_overdue"],
    },
    {
      id: "update_priority",
      name: "Escalate Priority to High",
      type: "update",
      config: {
        table: "tasks",
        filters: {
          status: "pending",
          // Would need to filter by IDs from previous step in real implementation
        },
        updates: {
          priority: "high",
        },
      },
      dependsOn: ["filter_overdue", "check_count"],
      continueOnError: true,
    },
    {
      id: "notify_overdue",
      name: "Send Overdue Alert",
      type: "notify",
      config: {
        message: "ALERT: Overdue tasks have been escalated to high priority. Immediate action required.",
        recipients: ["counselor"],
      },
      dependsOn: ["update_priority"],
    },
  ],
};

/**
 * All available templates
 */
export const workflowTemplates: WorkflowTemplate[] = [
  atRiskStudentWorkflow,
  weeklyDeadlineWorkflow,
  collegeRecommendationWorkflow,
  progressAuditWorkflow,
  overdueTaskWorkflow,
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter((t) => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  return Array.from(new Set(workflowTemplates.map((t) => t.category)));
}
