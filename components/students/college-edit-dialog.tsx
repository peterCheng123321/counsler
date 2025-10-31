"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface College {
  id: string;
  name: string;
  application_status: string;
  deadline?: string;
  decision?: string;
  notes?: string;
}

interface CollegeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  college?: College;
  onSuccess: () => void;
}

export function CollegeEditDialog({
  open,
  onOpenChange,
  studentId,
  college,
  onSuccess,
}: CollegeEditDialogProps) {
  const isEdit = !!college;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: college?.name || "",
    application_status: college?.application_status || "pending",
    deadline: college?.deadline
      ? new Date(college.deadline).toISOString().split("T")[0]
      : "",
    decision: college?.decision || "",
    notes: college?.notes || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = isEdit
        ? `/api/v1/students/${studentId}/colleges/${college.id}`
        : `/api/v1/students/${studentId}/colleges`;

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          application_status: formData.application_status,
          deadline: formData.deadline || null,
          decision: formData.decision || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save college");
      }

      toast.success(
        isEdit
          ? "College updated successfully"
          : "College added successfully"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving college:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save college"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit College Application" : "Add College Application"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              College Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Harvard University"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="application_status">
              Application Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.application_status}
              onValueChange={(value) =>
                handleChange("application_status", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Application Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => handleChange("deadline", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision">Decision</Label>
            <Input
              id="decision"
              value={formData.decision}
              onChange={(e) => handleChange("decision", e.target.value)}
              placeholder="e.g. Early Action, Regular Decision"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add any notes about this application..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Add College"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
