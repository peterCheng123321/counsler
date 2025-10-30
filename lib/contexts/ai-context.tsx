"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Student, Task } from "@/lib/api/client";

export type AIPage = "students" | "tasks" | "chatbot" | "student-detail" | "task-detail";

export interface AIAction {
  type: "create" | "update" | "delete" | "generate" | "add";
  entity: "student" | "task" | "college" | "letter";
  data: any;
  id?: string;
}

export interface AIContextType {
  // Current page context
  currentPage: AIPage | null;
  setCurrentPage: (page: AIPage) => void;

  // Selected entities
  currentStudent: Student | null;
  currentTask: Task | null;
  setCurrentStudent: (student: Student | null) => void;
  setCurrentTask: (task: Task | null) => void;

  // Pending AI action
  pendingAction: AIAction | null;
  setPendingAction: (action: AIAction | null) => void;

  // Confirmation dialog state
  showConfirmation: boolean;
  setShowConfirmation: (show: boolean) => void;

  // Get context string for AI
  getContextString: () => string;

  // Execute confirmed action
  executeAction: (action: AIAction) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<AIPage | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Generate context string for AI
  const getContextString = useCallback(() => {
    const parts: string[] = [];

    if (currentPage) {
      parts.push(`Current page: ${currentPage}`);
    }

    if (currentStudent) {
      parts.push(
        `Selected student: ${currentStudent.first_name} ${currentStudent.last_name} (ID: ${currentStudent.id})`
      );
      if (currentStudent.email) {
        parts.push(`Email: ${currentStudent.email}`);
      }
      if (currentStudent.graduation_year) {
        parts.push(`Graduation year: ${currentStudent.graduation_year}`);
      }
      if (currentStudent.gpa_unweighted) {
        parts.push(`GPA: ${currentStudent.gpa_unweighted}`);
      }
    }

    if (currentTask) {
      parts.push(
        `Selected task: ${currentTask.title} (ID: ${currentTask.id}, Status: ${currentTask.status})`
      );
      if (currentTask.due_date) {
        parts.push(`Due date: ${currentTask.due_date}`);
      }
      if (currentTask.priority) {
        parts.push(`Priority: ${currentTask.priority}`);
      }
    }

    return parts.length > 0
      ? `\n\n[Context: ${parts.join(", ")}]`
      : "";
  }, [currentPage, currentStudent, currentTask]);

  // Execute confirmed action
  const executeAction = useCallback(async (action: AIAction) => {
    try {
      const baseUrl = "/api/v1";

      switch (action.entity) {
        case "student":
          if (action.type === "create") {
            await fetch(`${baseUrl}/students`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "update" && action.id) {
            await fetch(`${baseUrl}/students/${action.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "delete" && action.id) {
            await fetch(`${baseUrl}/students/${action.id}`, {
              method: "DELETE",
            });
          }
          break;

        case "task":
          if (action.type === "create") {
            await fetch(`${baseUrl}/tasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "update" && action.id) {
            await fetch(`${baseUrl}/tasks/${action.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "delete" && action.id) {
            await fetch(`${baseUrl}/tasks/${action.id}`, {
              method: "DELETE",
            });
          }
          break;

        case "college":
          if (action.type === "add" && action.data.studentId) {
            // Add college to student
            const studentId = action.data.studentId;
            await fetch(`${baseUrl}/students/${studentId}/colleges`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "create") {
            // Create standalone college
            await fetch(`${baseUrl}/colleges`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "update" && action.id) {
            // Update college
            await fetch(`${baseUrl}/colleges/${action.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "delete" && action.id) {
            // Delete college or remove from student
            if (action.data.studentId) {
              // Remove college from student
              await fetch(`${baseUrl}/students/${action.data.studentId}/colleges/${action.id}`, {
                method: "DELETE",
              });
            } else {
              // Delete standalone college
              await fetch(`${baseUrl}/colleges/${action.id}`, {
                method: "DELETE",
              });
            }
          }
          break;

        case "letter":
          if (action.type === "generate") {
            // Generate Letter of Recommendation
            await fetch(`${baseUrl}/letters/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "update" && action.id) {
            // Update letter
            await fetch(`${baseUrl}/letters/${action.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data),
            });
          } else if (action.type === "delete" && action.id) {
            // Delete letter
            await fetch(`${baseUrl}/letters/${action.id}`, {
              method: "DELETE",
            });
          }
          break;

        default:
          throw new Error(`Unknown entity type: ${action.entity}`);
      }
    } catch (error) {
      console.error("Error executing AI action:", error);
      throw error;
    }
  }, []);

  const value: AIContextType = {
    currentPage,
    setCurrentPage,
    currentStudent,
    currentTask,
    setCurrentStudent,
    setCurrentTask,
    pendingAction,
    setPendingAction,
    showConfirmation,
    setShowConfirmation,
    getContextString,
    executeAction,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
}
