"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, User, Flag, Check, X, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  low: "bg-text-tertiary/10 text-text-secondary",
  medium: "bg-warning-light text-warning",
  high: "bg-error-light text-error",
};

const statusColors = {
  pending: "bg-text-tertiary/10 text-text-secondary",
  in_progress: "bg-primary-light text-primary-dark",
  completed: "bg-success-light text-success",
  cancelled: "bg-error-light text-error",
};

export function TaskCard({ task }: TaskCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");

  const handleActionSelect = (action: AIAction, message: string) => {
    setPendingAction(action);
    setConfirmationMessage(message);
    setShowConfirmation(true);
  };

  const dueDate = new Date(task.due_date);
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && task.status !== "completed";
  const daysUntilDue = differenceInDays(dueDate, new Date());

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

  const handleStatusChange = (newStatus: Task["status"]) => {
    updateStatusMutation.mutate(newStatus);
  };

  return (
    <>
      <AIContextMenu
        entity={task}
        entityType="task"
        onActionSelect={handleActionSelect}
      >
        <Card className={`transition-all hover:shadow-md ${task.status === "completed" ? "opacity-75" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* Title and Status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-base font-semibold ${task.status === "completed" ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={statusColors[task.status]}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className={priorityColors[task.priority]}>
                      <Flag className="h-3 w-3 mr-1" />
                      {task.priority}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-body-sm text-text-secondary line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-body-sm text-text-tertiary">
                  <div className="flex items-center gap-1">
                    <Calendar className={`h-4 w-4 ${isOverdue ? "text-error" : ""}`} />
                    <span className={isOverdue ? "text-error font-semibold" : ""}>
                      {format(dueDate, "MMM d, yyyy")}
                      {isOverdue && " (Overdue)"}
                      {!isOverdue && daysUntilDue >= 0 && daysUntilDue <= 7 && ` (${daysUntilDue}d)`}
                    </span>
                  </div>
                  {task.due_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{task.due_time}</span>
                    </div>
                  )}
                  {task.students && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>
                        {task.students.first_name} {task.students.last_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {task.status !== "completed" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStatusChange("completed")}
                    title="Mark as completed"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                {task.status === "completed" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStatusChange("pending")}
                    title="Mark as pending"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </AIContextMenu>

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


