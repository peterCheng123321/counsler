"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, User, Flag, Check, X, Clock, Trash2, MoreVertical, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AIContextMenu } from "@/components/ai/ai-context-menu";
import { AIConfirmationDialog } from "@/components/ai/ai-confirmation-dialog";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { apiClient, type Task } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import type { AIAction } from "@/lib/contexts/ai-context";

interface TaskCardProps {
  task: Task;
}

const priorityColors = {
  low: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

const priorityIconColors = {
  low: "text-blue-600",
  medium: "text-amber-600",
  high: "text-red-600",
};

const statusColors = {
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-purple-100 text-purple-700 border-purple-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export function TaskCard({ task }: TaskCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleActionSelect = (action: AIAction, message: string) => {
    setPendingAction(action);
    setConfirmationMessage(message);
    setShowConfirmation(true);
  };

  const dueDate = new Date(task.due_date);
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && task.status !== "completed";
  const daysUntilDue = differenceInDays(dueDate, new Date());

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: Task["status"]) =>
      apiClient.updateTask(task.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task updated",
        description: "Task status has been updated.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "error",
      });
    },
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: (priority: Task["priority"]) =>
      apiClient.updateTask(task.id, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Priority updated",
        description: "Task priority has been changed.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update priority",
        variant: "error",
      });
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task deleted",
        description: "The task has been removed.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "error",
      });
    },
  });

  const handleStatusChange = (newStatus: Task["status"]) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handlePriorityChange = (newPriority: Task["priority"]) => {
    updatePriorityMutation.mutate(newPriority);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <AIContextMenu
        entity={task}
        entityType="task"
        onActionSelect={handleActionSelect}
      >
        <Card
          className={`
            transition-all duration-300 cursor-pointer
            ${task.status === "completed" ? "opacity-75" : ""}
            ${isHovered ? "shadow-lg scale-[1.02] border-primary/30" : "hover:shadow-md"}
            ${isOverdue && task.status !== "completed" ? "border-l-4 border-l-red-500" : ""}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Title and Badges */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <h3 className={`text-lg font-semibold flex-1 transition-colors ${task.status === "completed" ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                      {task.title}
                    </h3>
                    {task.status !== "completed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange("completed");
                        }}
                        title="Mark as completed"
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${statusColors[task.status]} font-medium transition-all`}
                    >
                      {task.status.replace("_", " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`${priorityColors[task.priority]} font-medium transition-all`}
                    >
                      <Flag className="h-3 w-3 mr-1" />
                      {task.priority}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
                  <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                    <Calendar className={`h-4 w-4 ${isOverdue ? "text-red-600" : ""}`} />
                    <span>
                      {format(dueDate, "MMM d, yyyy")}
                      {isOverdue && " (Overdue)"}
                      {!isOverdue && daysUntilDue >= 0 && daysUntilDue <= 7 && ` (${daysUntilDue}d left)`}
                    </span>
                  </div>
                  {task.due_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{task.due_time}</span>
                    </div>
                  )}
                  {task.students && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      <span>
                        {task.students.first_name} {task.students.last_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className={`flex items-center gap-1 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
                {/* Priority Change Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${priorityIconColors[task.priority]} hover:bg-gray-100 transition-all`}
                      title="Change priority"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handlePriorityChange("high")}>
                      <ChevronUp className="h-4 w-4 mr-2 text-red-600" />
                      <span className="text-red-600 font-medium">High Priority</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePriorityChange("medium")}>
                      <Minus className="h-4 w-4 mr-2 text-amber-600" />
                      <span className="text-amber-600 font-medium">Medium Priority</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePriorityChange("low")}>
                      <ChevronDown className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-blue-600 font-medium">Low Priority</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                {/* More Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-gray-100 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
                      Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange("in_progress")}>
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange("cancelled")}>
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </AIContextMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Confirmation Dialog */}
      <AIConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        action={pendingAction}
        message={confirmationMessage}
        onSuccess={() => {
          // Refresh will be handled by React Query invalidation in the dialog
        }}
      />
    </>
  );
}
