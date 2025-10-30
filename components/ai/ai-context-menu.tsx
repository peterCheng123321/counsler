"use client";

import React, { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Sparkles,
  Edit,
  Trash2,
  GraduationCap,
  FileText,
  Calendar,
  Target,
} from "lucide-react";
import type { Student, Task } from "@/lib/api/client";
import type { AIAction } from "@/lib/contexts/ai-context";

interface AIContextMenuProps {
  children: ReactNode;
  entity: Student | Task;
  entityType: "student" | "task";
  onActionSelect: (action: AIAction, message: string) => void;
}

export function AIContextMenu({
  children,
  entity,
  entityType,
  onActionSelect,
}: AIContextMenuProps) {
  const handleQuickUpdate = (field: string, label: string) => {
    const message = `Update ${label} for this ${entityType}. What would you like to change it to?`;

    onActionSelect(
      {
        type: "update",
        entity: entityType,
        id: entity.id,
        data: {}, // Will be filled by user in dialog
      },
      message
    );
  };

  const handleDelete = () => {
    const name = entityType === "student"
      ? `${(entity as Student).first_name} ${(entity as Student).last_name}`
      : (entity as Task).title;

    const message = `⚠️ **WARNING: This is a destructive action!**\n\nAre you sure you want to delete: **${name}**?\n\nThis action cannot be undone.`;

    onActionSelect(
      {
        type: "delete",
        entity: entityType,
        id: entity.id,
        data: {},
      },
      message
    );
  };

  // Student-specific actions
  const handleAddCollege = () => {
    const student = entity as Student;
    const message = `Add a college to ${student.first_name}'s application list. Which college and application type?`;

    onActionSelect(
      {
        type: "add",
        entity: "college",
        data: {
          studentId: student.id,
        },
      },
      message
    );
  };

  const handleGenerateLOR = () => {
    const student = entity as Student;
    const message = `Generate a Letter of Recommendation for ${student.first_name}. Which college is this for?`;

    onActionSelect(
      {
        type: "generate",
        entity: "letter",
        data: {
          studentId: student.id,
        },
      },
      message
    );
  };

  // Task-specific actions
  const handleChangeStatus = (status: string) => {
    const task = entity as Task;
    const message = `Change task status to "${status}" for: **${task.title}**`;

    onActionSelect(
      {
        type: "update",
        entity: "task",
        id: task.id,
        data: { status },
      },
      message
    );
  };

  const handleChangePriority = (priority: string) => {
    const task = entity as Task;
    const message = `Change task priority to "${priority}" for: **${task.title}**`;

    onActionSelect(
      {
        type: "update",
        entity: "task",
        id: task.id,
        data: { priority },
      },
      message
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Actions
          </div>
        </div>
        <ContextMenuSeparator />

        {entityType === "student" && (
          <>
            <ContextMenuItem onClick={handleAddCollege}>
              <GraduationCap className="mr-2 h-4 w-4" />
              Add College Application
            </ContextMenuItem>
            <ContextMenuItem onClick={handleGenerateLOR}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Letter of Recommendation
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Edit className="mr-2 h-4 w-4" />
                Quick Update
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={() => handleQuickUpdate("gpa", "GPA")}>
                  Update GPA
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleQuickUpdate("email", "Email")}>
                  Update Email
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleQuickUpdate("phone", "Phone")}>
                  Update Phone
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleQuickUpdate("graduationYear", "Graduation Year")}>
                  Update Graduation Year
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {entityType === "task" && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Target className="mr-2 h-4 w-4" />
                Change Status
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={() => handleChangeStatus("pending")}>
                  Pending
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleChangeStatus("in_progress")}>
                  In Progress
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleChangeStatus("completed")}>
                  Completed
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Calendar className="mr-2 h-4 w-4" />
                Change Priority
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={() => handleChangePriority("low")}>
                  Low
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleChangePriority("medium")}>
                  Medium
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleChangePriority("high")}>
                  High
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleChangePriority("urgent")}>
                  Urgent
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Edit className="mr-2 h-4 w-4" />
                Quick Update
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem onClick={() => handleQuickUpdate("title", "Title")}>
                  Update Title
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleQuickUpdate("dueDate", "Due Date")}>
                  Update Due Date
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleQuickUpdate("description", "Description")}>
                  Update Description
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {entityType === "student" ? "Student" : "Task"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
