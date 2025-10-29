/**
 * Smart Timeline Generator
 * Automatically generates personalized application timelines based on deadlines,
 * current progress, and workload distribution
 */

import { createClient } from "@/lib/supabase/server";
import { addDays, addWeeks, addMonths, format, differenceInDays } from "date-fns";

export interface TimelineTask {
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  priority: "low" | "medium" | "high";
  category: "essay" | "testing" | "application" | "lor" | "financial_aid" | "decision";
  studentId?: string;
  collegeId?: string;
  estimatedHours: number;
  dependencies?: string[]; // Task titles that should be completed first
}

export interface GeneratedTimeline {
  tasks: TimelineTask[];
  summary: string;
  warnings: string[];
  milestones: Array<{
    date: string;
    title: string;
    description: string;
  }>;
}

interface StudentApplicationContext {
  studentId: string;
  graduationYear: number;
  colleges: Array<{
    id: string;
    name: string;
    applicationType: "EA" | "ED" | "RD" | "Rolling";
    deadline: string;
  }>;
  currentProgress: number;
  essaysNeeded: number;
  testScoresComplete: boolean;
  transcriptReady: boolean;
}

/**
 * Generate a complete application timeline for a student
 */
export async function generateApplicationTimeline(
  studentId: string
): Promise<GeneratedTimeline> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get student context
  const context = await getStudentContext(studentId, user.id);

  if (!context) {
    throw new Error("Student not found");
  }

  const tasks: TimelineTask[] = [];
  const warnings: string[] = [];
  const milestones: Array<{ date: string; title: string; description: string }> = [];

  const today = new Date();

  // Generate tasks based on application deadlines
  for (const college of context.colleges) {
    const deadlineDate = new Date(college.deadline);
    const daysUntilDeadline = differenceInDays(deadlineDate, today);

    // Warn if deadline is very close
    if (daysUntilDeadline < 30 && daysUntilDeadline > 0) {
      warnings.push(
        `⚠️ ${college.name} deadline is in ${daysUntilDeadline} days - urgent action needed!`
      );
    } else if (daysUntilDeadline <= 0) {
      warnings.push(`❌ ${college.name} deadline has passed`);
      continue; // Skip past deadlines
    }

    // Generate timeline tasks working backward from deadline
    const collegeTasks = generateCollegeTimeline(
      context.studentId,
      college,
      deadlineDate,
      today,
      context
    );

    tasks.push(...collegeTasks);

    // Add milestone for application deadline
    milestones.push({
      date: format(deadlineDate, "yyyy-MM-dd"),
      title: `${college.name} Application Due`,
      description: `Submit ${college.applicationType} application for ${college.name}`,
    });
  }

  // Add general preparation tasks (if early in process)
  const generalTasks = generateGeneralPreparationTasks(context, today);
  tasks.push(...generalTasks);

  // Sort tasks by due date
  tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Remove duplicates (same title and date)
  const uniqueTasks = deduplicateTasks(tasks);

  // Add key milestones
  addKeyMilestones(milestones, context, today);

  // Generate summary
  const summary = generateTimelineSummary(uniqueTasks, context, warnings);

  return {
    tasks: uniqueTasks,
    summary,
    warnings,
    milestones: milestones.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * Get student application context
 */
async function getStudentContext(
  studentId: string,
  userId: string
): Promise<StudentApplicationContext | null> {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .select(`
      id,
      graduation_year,
      application_progress,
      sat_score,
      act_score,
      transcript_url,
      student_colleges (
        id,
        application_type,
        deadline,
        colleges (
          id,
          name
        )
      ),
      essays (id)
    `)
    .eq("id", studentId)
    .eq("counselor_id", userId)
    .single();

  if (error || !student) {
    return null;
  }

  const colleges = (student.student_colleges || []).map((sc: any) => ({
    id: sc.colleges.id,
    name: sc.colleges.name,
    applicationType: sc.application_type,
    deadline: sc.deadline,
  }));

  return {
    studentId: student.id,
    graduationYear: student.graduation_year,
    colleges,
    currentProgress: student.application_progress || 0,
    essaysNeeded: colleges.length * 3, // Estimate: 1 main + 2 supplemental per college
    testScoresComplete: !!(student.sat_score || student.act_score),
    transcriptReady: !!student.transcript_url,
  };
}

/**
 * Generate timeline for a specific college application
 */
function generateCollegeTimeline(
  studentId: string,
  college: { id: string; name: string; applicationType: string; deadline: string },
  deadlineDate: Date,
  today: Date,
  context: StudentApplicationContext
): TimelineTask[] {
  const tasks: TimelineTask[] = [];

  // Working backward from deadline
  const submitDate = addDays(deadlineDate, -1); // Submit 1 day before deadline

  // Final review (3-5 days before submission)
  tasks.push({
    title: `Final Review: ${college.name} Application`,
    description: `Complete final review of all application components, check for errors, and verify all materials are uploaded.`,
    dueDate: format(addDays(submitDate, -3), "yyyy-MM-dd"),
    priority: "high",
    category: "application",
    studentId,
    collegeId: college.id,
    estimatedHours: 3,
  });

  // Submit application
  tasks.push({
    title: `Submit Application: ${college.name}`,
    description: `Submit complete application for ${college.name} (${college.applicationType})`,
    dueDate: format(submitDate, "yyyy-MM-dd"),
    dueTime: "23:59",
    priority: "high",
    category: "application",
    studentId,
    collegeId: college.id,
    estimatedHours: 1,
    dependencies: [`Final Review: ${college.name} Application`],
  });

  // Essays (2-4 weeks before submission)
  const essayDeadline = addWeeks(submitDate, -3);

  tasks.push({
    title: `Complete Main Essay for ${college.name}`,
    description: `Write and finalize personal statement/main essay for ${college.name}. Aim for 2-3 drafts with peer/counselor review.`,
    dueDate: format(essayDeadline, "yyyy-MM-dd"),
    priority: "high",
    category: "essay",
    studentId,
    collegeId: college.id,
    estimatedHours: 15,
  });

  tasks.push({
    title: `Complete Supplemental Essays for ${college.name}`,
    description: `Write all supplemental essays for ${college.name}. Research the school thoroughly to demonstrate fit.`,
    dueDate: format(addWeeks(submitDate, -2), "yyyy-MM-dd"),
    priority: "high",
    category: "essay",
    studentId,
    collegeId: college.id,
    estimatedHours: 12,
    dependencies: [`Complete Main Essay for ${college.name}`],
  });

  // Letters of Recommendation (4-6 weeks before deadline)
  const lorDeadline = addWeeks(deadlineDate, -4);

  tasks.push({
    title: `Request Letters of Recommendation for ${college.name}`,
    description: `Reach out to teachers/mentors for LORs. Provide them with resume, accomplishments, and specific points to highlight.`,
    dueDate: format(lorDeadline, "yyyy-MM-dd"),
    priority: "medium",
    category: "lor",
    studentId,
    collegeId: college.id,
    estimatedHours: 2,
  });

  tasks.push({
    title: `Follow up on LORs for ${college.name}`,
    description: `Politely check in with recommenders to ensure letters will be submitted on time.`,
    dueDate: format(addWeeks(deadlineDate, -2), "yyyy-MM-dd"),
    priority: "medium",
    category: "lor",
    studentId,
    collegeId: college.id,
    estimatedHours: 0.5,
    dependencies: [`Request Letters of Recommendation for ${college.name}`],
  });

  // Transcript and test scores (3-4 weeks before)
  if (!context.transcriptReady) {
    tasks.push({
      title: `Order Official Transcript for ${college.name}`,
      description: `Request official transcript to be sent to ${college.name}. Verify all grades are accurate.`,
      dueDate: format(addWeeks(deadlineDate, -4), "yyyy-MM-dd"),
      priority: "high",
      category: "application",
      studentId,
      collegeId: college.id,
      estimatedHours: 1,
    });
  }

  if (!context.testScoresComplete) {
    tasks.push({
      title: `Send Test Scores to ${college.name}`,
      description: `Send official SAT/ACT scores to ${college.name} through College Board/ACT.`,
      dueDate: format(addWeeks(deadlineDate, -4), "yyyy-MM-dd"),
      priority: "high",
      category: "testing",
      studentId,
      collegeId: college.id,
      estimatedHours: 1,
    });
  }

  // Application form completion (2-3 weeks before)
  tasks.push({
    title: `Complete Application Form: ${college.name}`,
    description: `Fill out all sections of the application form including activities, honors, family information, etc.`,
    dueDate: format(addWeeks(submitDate, -2.5), "yyyy-MM-dd"),
    priority: "high",
    category: "application",
    studentId,
    collegeId: college.id,
    estimatedHours: 4,
  });

  // Financial aid (if applicable, 1-2 weeks before)
  if (college.applicationType === "ED" || college.applicationType === "EA") {
    tasks.push({
      title: `Complete CSS Profile for ${college.name}`,
      description: `Submit CSS Profile for financial aid consideration (if required by school).`,
      dueDate: format(addWeeks(deadlineDate, -1), "yyyy-MM-dd"),
      priority: "medium",
      category: "financial_aid",
      studentId,
      collegeId: college.id,
      estimatedHours: 3,
    });
  }

  return tasks;
}

/**
 * Generate general preparation tasks (early in the process)
 */
function generateGeneralPreparationTasks(
  context: StudentApplicationContext,
  today: Date
): TimelineTask[] {
  const tasks: TimelineTask[] = [];

  // Only add if early in the process
  if (context.currentProgress < 30) {
    // College research
    tasks.push({
      title: "Research College Options",
      description: "Explore and create a list of 15-20 colleges that match academic profile, interests, and preferences.",
      dueDate: format(addWeeks(today, 2), "yyyy-MM-dd"),
      priority: "medium",
      category: "application",
      studentId: context.studentId,
      estimatedHours: 8,
    });

    // Testing strategy
    if (!context.testScoresComplete) {
      tasks.push({
        title: "Create Testing Timeline",
        description: "Plan SAT/ACT test dates, register for exams, and create study schedule.",
        dueDate: format(addWeeks(today, 1), "yyyy-MM-dd"),
        priority: "high",
        category: "testing",
        studentId: context.studentId,
        estimatedHours: 2,
      });

      tasks.push({
        title: "Complete Standardized Testing",
        description: "Take SAT or ACT to meet application requirements. Aim to complete by fall of senior year.",
        dueDate: format(addMonths(today, 2), "yyyy-MM-dd"),
        priority: "high",
        category: "testing",
        studentId: context.studentId,
        estimatedHours: 4,
      });
    }

    // Resume building
    tasks.push({
      title: "Create/Update Resume",
      description: "Build comprehensive resume listing all activities, honors, work experience, and accomplishments.",
      dueDate: format(addWeeks(today, 2), "yyyy-MM-dd"),
      priority: "medium",
      category: "application",
      studentId: context.studentId,
      estimatedHours: 4,
    });

    // Identify recommenders
    tasks.push({
      title: "Identify Letter of Recommendation Writers",
      description: "Choose 2-3 teachers/mentors who know you well and can write strong letters. Prepare brag sheet for them.",
      dueDate: format(addWeeks(today, 3), "yyyy-MM-dd"),
      priority: "medium",
      category: "lor",
      studentId: context.studentId,
      estimatedHours: 3,
    });
  }

  return tasks;
}

/**
 * Remove duplicate tasks
 */
function deduplicateTasks(tasks: TimelineTask[]): TimelineTask[] {
  const seen = new Set<string>();
  const unique: TimelineTask[] = [];

  for (const task of tasks) {
    const key = `${task.title}:${task.dueDate}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(task);
    }
  }

  return unique;
}

/**
 * Add key milestones to timeline
 */
function addKeyMilestones(
  milestones: Array<{ date: string; title: string; description: string }>,
  context: StudentApplicationContext,
  today: Date
): void {
  const graduationDate = new Date(context.graduationYear, 5, 1); // June 1st

  // Key dates in college application cycle
  const seniorYearStart = new Date(context.graduationYear - 1, 8, 1); // September
  const eaEdDeadline = new Date(context.graduationYear - 1, 10, 1); // November 1
  const rdDeadline = new Date(context.graduationYear, 0, 1); // January 1
  const decisionDay = new Date(context.graduationYear, 4, 1); // May 1

  if (seniorYearStart > today) {
    milestones.push({
      date: format(seniorYearStart, "yyyy-MM-dd"),
      title: "Senior Year Begins",
      description: "Start of senior year - time to finalize college list and begin applications",
    });
  }

  if (eaEdDeadline > today) {
    milestones.push({
      date: format(eaEdDeadline, "yyyy-MM-dd"),
      title: "Early Action/Early Decision Deadline",
      description: "Common deadline for EA/ED applications",
    });
  }

  if (rdDeadline > today) {
    milestones.push({
      date: format(rdDeadline, "yyyy-MM-dd"),
      title: "Regular Decision Deadline",
      description: "Common deadline for Regular Decision applications",
    });
  }

  milestones.push({
    date: format(decisionDay, "yyyy-MM-dd"),
    title: "National College Decision Day",
    description: "Deadline to commit to a college",
  });
}

/**
 * Generate timeline summary
 */
function generateTimelineSummary(
  tasks: TimelineTask[],
  context: StudentApplicationContext,
  warnings: string[]
): string {
  const totalHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  const highPriorityTasks = tasks.filter(t => t.priority === "high").length;
  const collegeCount = context.colleges.length;

  let summary = `Generated personalized timeline with ${tasks.length} tasks across ${collegeCount} college applications. `;
  summary += `Estimated total workload: ${totalHours} hours. `;
  summary += `${highPriorityTasks} high-priority tasks require immediate attention. `;

  if (warnings.length > 0) {
    summary += `⚠️ ${warnings.length} deadline warnings - review urgently.`;
  } else {
    summary += `✅ All deadlines are manageable with proper planning.`;
  }

  return summary;
}

/**
 * Auto-create timeline tasks in database
 */
export async function createTimelineTasks(
  studentId: string,
  timeline: GeneratedTimeline
): Promise<{ created: number; skipped: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  let created = 0;
  let skipped = 0;

  for (const task of timeline.tasks) {
    // Check if similar task already exists
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("counselor_id", user.id)
      .eq("student_id", task.studentId || null)
      .eq("title", task.title)
      .eq("due_date", task.dueDate)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    // Create task
    const { error } = await supabase.from("tasks").insert({
      counselor_id: user.id,
      student_id: task.studentId || null,
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      due_time: task.dueTime || null,
      priority: task.priority,
      status: "pending",
    });

    if (!error) {
      created++;
    }
  }

  return { created, skipped };
}
