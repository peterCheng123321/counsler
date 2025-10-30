/**
 * CRUD LangChain Tools
 * These tools propose actions that require user confirmation before execution
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// ============================================================================
// STUDENT CRUD TOOLS
// ============================================================================

export const createStudentTool = new DynamicStructuredTool({
  name: "create_student",
  description: `Propose creating a new student. This will ask for user confirmation before creating.
Use this when the user wants to add a new student to the system.
Required: firstName, lastName, email, graduationYear
Optional: gpa, phone, address, notes`,
  schema: z.object({
    firstName: z.string().describe("Student's first name"),
    lastName: z.string().describe("Student's last name"),
    email: z.string().email().describe("Student's email address"),
    graduationYear: z.number().describe("Expected graduation year (e.g., 2025)"),
    gpa: z.number().optional().describe("GPA (0.0-4.0)"),
    phone: z.string().optional().describe("Phone number"),
    address: z.string().optional().describe("Home address"),
    notes: z.string().optional().describe("Additional notes"),
  }),
  func: async (data) => {
    return JSON.stringify({
      action: "create_student",
      status: "pending_confirmation",
      entity: "student",
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        graduationYear: data.graduationYear,
        gpa: data.gpa,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
      },
      message: `I will create a new student:\n- Name: ${data.firstName} ${data.lastName}\n- Email: ${data.email}\n- Graduation Year: ${data.graduationYear}${data.gpa ? `\n- GPA: ${data.gpa}` : ""}\n\n**Please confirm this action.**`,
    });
  },
});

export const updateStudentTool = new DynamicStructuredTool({
  name: "update_student",
  description: `Propose updating an existing student's information. This will ask for user confirmation.
Use this when the user wants to modify a student's details.
Required: studentId and at least one field to update`,
  schema: z.object({
    studentId: z.string().uuid().describe("The ID of the student to update"),
    firstName: z.string().optional().describe("Updated first name"),
    lastName: z.string().optional().describe("Updated last name"),
    email: z.string().email().optional().describe("Updated email"),
    graduationYear: z.number().optional().describe("Updated graduation year"),
    gpa: z.number().optional().describe("Updated GPA"),
    phone: z.string().optional().describe("Updated phone"),
    address: z.string().optional().describe("Updated address"),
    notes: z.string().optional().describe("Updated notes"),
  }),
  func: async (data) => {
    const { studentId, ...updates } = data;
    const updateFields = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");

    return JSON.stringify({
      action: "update_student",
      status: "pending_confirmation",
      entity: "student",
      id: studentId,
      data: updates,
      message: `I will update the student with these changes:\n${updateFields}\n\n**Please confirm this action.**`,
    });
  },
});

export const deleteStudentTool = new DynamicStructuredTool({
  name: "delete_student",
  description: `Propose deleting a student from the system. This is a destructive action that requires confirmation.
Use this when the user wants to remove a student permanently.
WARNING: This will also delete all associated tasks and application data.`,
  schema: z.object({
    studentId: z.string().uuid().describe("The ID of the student to delete"),
    studentName: z.string().describe("The student's name for confirmation"),
  }),
  func: async (data) => {
    return JSON.stringify({
      action: "delete_student",
      status: "pending_confirmation",
      entity: "student",
      id: data.studentId,
      data: { studentId: data.studentId },
      message: `⚠️ **WARNING: This is a destructive action!**\n\nI will permanently delete the student: **${data.studentName}**\n\nThis will also remove:\n- All tasks assigned to this student\n- All college applications\n- All essays and letters of recommendation\n\n**Please confirm this action.**`,
    });
  },
});

// ============================================================================
// TASK CRUD TOOLS
// ============================================================================

export const createTaskTool = new DynamicStructuredTool({
  name: "create_task",
  description: `Propose creating a new task. This will ask for user confirmation.
Use this when the user wants to add a task or deadline.
Required: title, status
Optional: description, dueDate, priority, studentId`,
  schema: z.object({
    title: z.string().describe("Task title"),
    description: z.string().optional().describe("Task description"),
    status: z.enum(["pending", "in_progress", "completed"]).describe("Task status"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Task priority"),
    dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    studentId: z.string().uuid().optional().describe("Associate task with a student"),
  }),
  func: async (data) => {
    return JSON.stringify({
      action: "create_task",
      status: "pending_confirmation",
      entity: "task",
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        studentId: data.studentId || "none",
      },
      message: `I will create a new task:\n- Title: ${data.title}\n- Status: ${data.status}${data.priority ? `\n- Priority: ${data.priority}` : ""}${data.dueDate ? `\n- Due Date: ${data.dueDate}` : ""}${data.description ? `\n- Description: ${data.description}` : ""}\n\n**Please confirm this action.**`,
    });
  },
});

export const updateTaskTool = new DynamicStructuredTool({
  name: "update_task",
  description: `Propose updating an existing task. This will ask for user confirmation.
Use this when the user wants to modify a task's details, change status, or update deadline.
Required: taskId and at least one field to update`,
  schema: z.object({
    taskId: z.string().uuid().describe("The ID of the task to update"),
    title: z.string().optional().describe("Updated title"),
    description: z.string().optional().describe("Updated description"),
    status: z.enum(["pending", "in_progress", "completed"]).optional().describe("Updated status"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Updated priority"),
    dueDate: z.string().optional().describe("Updated due date (YYYY-MM-DD)"),
    studentId: z.string().uuid().optional().describe("Updated student assignment"),
  }),
  func: async (data) => {
    const { taskId, ...updates } = data;
    const updateFields = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");

    return JSON.stringify({
      action: "update_task",
      status: "pending_confirmation",
      entity: "task",
      id: taskId,
      data: updates,
      message: `I will update the task with these changes:\n${updateFields}\n\n**Please confirm this action.**`,
    });
  },
});

export const deleteTaskTool = new DynamicStructuredTool({
  name: "delete_task",
  description: `Propose deleting a task from the system. This requires confirmation.
Use this when the user wants to remove a task permanently.`,
  schema: z.object({
    taskId: z.string().uuid().describe("The ID of the task to delete"),
    taskTitle: z.string().describe("The task title for confirmation"),
  }),
  func: async (data) => {
    return JSON.stringify({
      action: "delete_task",
      status: "pending_confirmation",
      entity: "task",
      id: data.taskId,
      data: { taskId: data.taskId },
      message: `I will permanently delete the task: **${data.taskTitle}**\n\n**Please confirm this action.**`,
    });
  },
});

// ============================================================================
// COLLEGE CRUD TOOLS (To be implemented with College API)
// ============================================================================

export const addCollegeToStudentTool = new DynamicStructuredTool({
  name: "add_college_to_student",
  description: `Propose adding a college to a student's application list. This requires confirmation.
Use this when a user wants to add a college that a student is applying to.
Required: studentId, collegeName, applicationType
Optional: deadline, applicationStatus`,
  schema: z.object({
    studentId: z.string().uuid().describe("The student's ID"),
    collegeName: z.string().describe("Name of the college"),
    applicationType: z.enum(["ED", "EA", "RD", "Rolling"]).describe("Application type"),
    deadline: z.string().optional().describe("Application deadline (YYYY-MM-DD)"),
    applicationStatus: z.string().optional().describe("Current status (e.g., 'not started', 'in progress')"),
  }),
  func: async (data) => {
    return JSON.stringify({
      action: "add_college",
      status: "pending_confirmation",
      entity: "college",
      data: {
        studentId: data.studentId,
        collegeName: data.collegeName,
        applicationType: data.applicationType,
        deadline: data.deadline,
        applicationStatus: data.applicationStatus || "not started",
      },
      message: `I will add **${data.collegeName}** to the student's college list:\n- Application Type: ${data.applicationType}${data.deadline ? `\n- Deadline: ${data.deadline}` : ""}\n- Status: ${data.applicationStatus || "not started"}\n\n**Please confirm this action.**`,
    });
  },
});

// ============================================================================
// DOCUMENT GENERATION TOOLS
// ============================================================================

export const generateLetterOfRecommendationTool = new DynamicStructuredTool({
  name: "generate_letter_of_recommendation",
  description: `Propose generating a Letter of Recommendation for a student. This requires confirmation.
Use this when the user wants to create a recommendation letter.
The AI will generate a draft based on the student's information.`,
  schema: z.object({
    studentId: z.string().uuid().describe("The student's ID"),
    collegeName: z.string().describe("College the letter is for"),
    strengths: z.array(z.string()).optional().describe("Student's key strengths to highlight"),
    tone: z.enum(["formal", "personal", "academic"]).optional().describe("Letter tone"),
  }),
  func: async (data) => {
    return JSON.stringify({
      action: "generate_lor",
      status: "pending_confirmation",
      entity: "letter",
      data: {
        studentId: data.studentId,
        collegeName: data.collegeName,
        strengths: data.strengths,
        tone: data.tone || "formal",
      },
      message: `I will generate a Letter of Recommendation for the student:\n- College: ${data.collegeName}\n- Tone: ${data.tone || "formal"}${data.strengths ? `\n- Highlighting: ${data.strengths.join(", ")}` : ""}\n\n**Please confirm to generate the draft.**`,
    });
  },
});

// Export all CRUD tools as an array for easy integration
export const crudTools = [
  createStudentTool,
  updateStudentTool,
  deleteStudentTool,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  addCollegeToStudentTool,
  generateLetterOfRecommendationTool,
];
