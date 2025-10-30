"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useAI, type AIAction } from "@/lib/contexts/ai-context";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface AIConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: AIAction | null;
  message?: string;
  onSuccess?: () => void;
}

export function AIConfirmationDialog({
  open,
  onOpenChange,
  action,
  message,
  onSuccess,
}: AIConfirmationDialogProps) {
  const { executeAction } = useAI();
  const [isExecuting, setIsExecuting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!action) return;

    setIsExecuting(true);

    try {
      await executeAction(action);

      // Invalidate relevant queries based on entity type
      switch (action.entity) {
        case "student":
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["student", action.id] });
          break;
        case "task":
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["task", action.id] });
          break;
        case "college":
          queryClient.invalidateQueries({ queryKey: ["colleges"] });
          break;
      }

      toast({
        title: "Success!",
        description: getSuccessMessage(action),
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error executing action:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute action",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action.type === "delete" ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Check className="h-5 w-5 text-primary" />
            )}
            {getDialogTitle(action)}
          </DialogTitle>
          <DialogDescription>
            Review the details below and confirm to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI Message */}
          {message && (
            <div className="rounded-lg bg-muted p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>
                  {message}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Action Details */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">
                Action Type
              </span>
              <span className="text-sm font-medium capitalize">
                {action.type} {action.entity}
              </span>
            </div>

            {action.id && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  Target ID
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {action.id}
                </span>
              </div>
            )}
          </div>

          {/* Data Preview */}
          {action.data && Object.keys(action.data).length > 0 && (
            <div className="rounded-lg border p-4">
              <h4 className="text-sm font-semibold mb-3">Data Changes</h4>
              <div className="space-y-2">
                {Object.entries(action.data).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground min-w-[120px]">
                      {formatFieldName(key)}:
                    </span>
                    <span className="text-sm flex-1 break-all">
                      {formatValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning for destructive actions */}
          {action.type === "delete" && (
            <div className="rounded-lg border-destructive bg-destructive/10 border p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-destructive">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete the {action.entity} and all associated data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isExecuting}
            variant={action.type === "delete" ? "destructive" : "default"}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirm & Execute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getDialogTitle(action: AIAction): string {
  const entityName = action.entity.charAt(0).toUpperCase() + action.entity.slice(1);

  switch (action.type) {
    case "create":
      return `Create New ${entityName}`;
    case "update":
      return `Update ${entityName}`;
    case "delete":
      return `Delete ${entityName}`;
    case "generate":
      return `Generate ${entityName}`;
    case "add":
      return `Add ${entityName}`;
    default:
      return `Confirm Action`;
  }
}

function getSuccessMessage(action: AIAction): string {
  const entityName = action.entity.charAt(0).toUpperCase() + action.entity.slice(1);

  switch (action.type) {
    case "create":
      return `${entityName} created successfully`;
    case "update":
      return `${entityName} updated successfully`;
    case "delete":
      return `${entityName} deleted successfully`;
    case "generate":
      return `${entityName} generated successfully`;
    case "add":
      return `${entityName} added successfully`;
    default:
      return "Action completed successfully";
  }
}

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
