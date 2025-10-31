"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  School,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CollegeEditDialog } from "./college-edit-dialog";

interface College {
  id: string;
  name: string;
  application_status: string;
  deadline?: string;
  decision?: string;
  notes?: string;
}

interface CollegeManagementProps {
  studentId: string;
}

export function CollegeManagement({ studentId }: CollegeManagementProps) {
  const queryClient = useQueryClient();
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch colleges
  const { data: colleges, isLoading } = useQuery({
    queryKey: ["student-colleges", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/students/${studentId}/colleges`);
      if (!response.ok) throw new Error("Failed to fetch colleges");
      const result = await response.json();
      return result.data || [];
    },
  });

  const handleDelete = async (collegeId: string) => {
    if (!confirm("Are you sure you want to remove this college?")) return;

    try {
      const response = await fetch(
        `/api/v1/students/${studentId}/colleges/${collegeId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete college");

      toast.success("College removed successfully");
      queryClient.invalidateQueries({ queryKey: ["student-colleges", studentId] });
    } catch (error) {
      console.error("Error deleting college:", error);
      toast.error("Failed to remove college");
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["student-colleges", studentId] });
    queryClient.invalidateQueries({ queryKey: ["student", studentId] });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      submitted: "bg-blue-100 text-blue-800 border-blue-200",
      accepted: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      waitlisted: "bg-purple-100 text-purple-800 border-purple-200",
      deferred: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "accepted") return <CheckCircle2 className="h-4 w-4" />;
    if (statusLower === "rejected" || statusLower === "waitlisted")
      return <AlertCircle className="h-4 w-4" />;
    return <School className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-text-secondary">Loading colleges...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            College Applications
          </h2>
          <p className="text-sm text-text-secondary">
            Manage student&apos;s college applications and track their status
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add College
        </Button>
      </div>

      {!colleges || colleges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <School className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No colleges added yet
            </h3>
            <p className="text-text-secondary mb-4">
              Start adding colleges to track application progress
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First College
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {colleges.map((college: College) => (
            <Card key={college.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-text-primary">
                      {college.name}
                    </h3>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCollege(college)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(college.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${getStatusColor(college.application_status)} border`}
                    >
                      {getStatusIcon(college.application_status)}
                      <span className="ml-1">
                        {college.application_status.charAt(0).toUpperCase() +
                          college.application_status.slice(1)}
                      </span>
                    </Badge>
                  </div>

                  {college.deadline && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Deadline:{" "}
                        {new Date(college.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {college.decision && (
                    <div className="text-sm">
                      <span className="font-medium">Decision: </span>
                      <span className="text-text-secondary">
                        {college.decision}
                      </span>
                    </div>
                  )}

                  {college.notes && (
                    <p className="text-sm text-text-secondary line-clamp-2 mt-2">
                      {college.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingCollege && (
        <CollegeEditDialog
          open={!!editingCollege}
          onOpenChange={(open) => !open && setEditingCollege(null)}
          studentId={studentId}
          college={editingCollege}
          onSuccess={handleSuccess}
        />
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <CollegeEditDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          studentId={studentId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
