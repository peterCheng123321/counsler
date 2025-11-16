"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  Loader2,
  User,
  Maximize2,
  Minimize2,
  Mail,
  Phone,
  GraduationCap,
  TrendingUp,
  FileText,
  Calendar,
  Edit,
  Save,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Student } from "@/lib/types/database";

interface StudentCanvasProps {
  studentId: string;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function StudentCanvas({
  studentId,
  onClose,
  isExpanded = false,
  onToggleExpand,
}: StudentCanvasProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Student>>({});

  // Use React Query for real-time data fetching with auto-refresh
  const { data: student, isLoading, refetch } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/students/${studentId}`);
      if (!response.ok) throw new Error("Failed to load student");
      const result = await response.json();
      if (!result.success || !result.data) throw new Error("Student not found");
      return result.data as Student;
    },
    refetchInterval: 15000, // Auto-refresh every 15 seconds (reduced from 5s)
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Fetch student stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["student-stats", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/students/${studentId}/stats`);
      if (!response.ok) return null;
      const result = await response.json();
      return result.success ? result.data : null;
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/v1/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedData),
      });

      if (!response.ok) throw new Error("Failed to update student");

      const result = await response.json();
      if (result.success) {
        toast.success("Student updated successfully");
        setIsEditing(false);
        setEditedData({});
        // Invalidate and refetch to get latest data
        queryClient.invalidateQueries({ queryKey: ["student", studentId] });
        queryClient.invalidateQueries({ queryKey: ["students"] });
        refetch();
      }
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student");
    }
  };

  const handleRefresh = () => {
    refetch();
    refetchStats();
    toast.success("Data refreshed");
  };

  if (isLoading) {
    return (
      <div className={`${isExpanded ? "fixed inset-4 z-50" : "h-full"} flex flex-col bg-white shadow-lg`}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-text-secondary">Loading student profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className={`${isExpanded ? "fixed inset-4 z-50" : "h-full"} flex flex-col bg-white shadow-lg`}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <X className="h-8 w-8 text-error" />
            <p className="text-text-secondary">Student not found</p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${
      isExpanded ? "fixed inset-4 z-50" : "h-full"
    } flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out overflow-hidden`}>
      {/* Header */}
      <div className="flex-none border-b border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="p-3 rounded-full bg-primary/20">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-text-primary truncate">
                {student.first_name} {student.last_name}
              </h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Class of {student.graduation_year}
                </Badge>
                <span className="text-sm text-text-secondary flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {student.application_progress}% Complete
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="gap-2"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            {isEditing ? (
              <Button
                onClick={handleSave}
                variant="default"
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setIsEditing(true);
                  setEditedData({
                    first_name: student?.first_name,
                    last_name: student?.last_name,
                    email: student?.email,
                    phone: student?.phone,
                    gpa: student?.gpa,
                    sat_score: student?.sat_score,
                    act_score: student?.act_score,
                  });
                }}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {onToggleExpand && (
              <Button
                onClick={onToggleExpand}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button onClick={onClose} variant="outline" size="sm" className="gap-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content - Full Height Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Editable Fields */}
          {isEditing && (
            <div className="p-4 rounded-lg bg-primary/5 border-2 border-primary/20 space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Editing Mode
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={editedData.first_name || ""}
                    onChange={(e) => setEditedData({ ...editedData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={editedData.last_name || ""}
                    onChange={(e) => setEditedData({ ...editedData, last_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedData.email || ""}
                    onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editedData.phone || ""}
                    onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gpa">GPA</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    value={editedData.gpa || ""}
                    onChange={(e) => setEditedData({ ...editedData, gpa: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="sat_score">SAT Score</Label>
                  <Input
                    id="sat_score"
                    type="number"
                    value={editedData.sat_score || ""}
                    onChange={(e) => setEditedData({ ...editedData, sat_score: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="act_score">ACT Score</Label>
                  <Input
                    id="act_score"
                    type="number"
                    value={editedData.act_score || ""}
                    onChange={(e) => setEditedData({ ...editedData, act_score: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedData({});
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-surface/50 border border-border/30">
              <Mail className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-tertiary font-semibold">Email</p>
                <p className="text-sm text-text-primary truncate">{student.email}</p>
              </div>
            </div>
            {student.phone && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-surface/50 border border-border/30">
                <Phone className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-tertiary font-semibold">Phone</p>
                  <p className="text-sm text-text-primary">{student.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Academic Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {student.gpa && (
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                <GraduationCap className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">{student.gpa.toFixed(2)}</p>
                <p className="text-xs text-blue-700 font-semibold">GPA</p>
              </div>
            )}
            {student.sat_score && (
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                <FileText className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{student.sat_score}</p>
                <p className="text-xs text-green-700 font-semibold">SAT</p>
              </div>
            )}
            {student.act_score && (
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                <FileText className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-900">{student.act_score}</p>
                <p className="text-xs text-purple-700 font-semibold">ACT</p>
              </div>
            )}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/30">
              <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary-dark">{student.application_progress}%</p>
              <p className="text-xs text-primary font-semibold">Progress</p>
            </div>
          </div>

          {/* Application Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                <p className="text-xs text-amber-700 font-semibold mb-1">Colleges Applied</p>
                <p className="text-3xl font-bold text-amber-900">{stats.collegesApplied || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200">
                <p className="text-xs text-cyan-700 font-semibold mb-1">Essays Complete</p>
                <p className="text-3xl font-bold text-cyan-900">{stats.essaysComplete || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200">
                <p className="text-xs text-pink-700 font-semibold mb-1">LORs Requested</p>
                <p className="text-3xl font-bold text-pink-900">{stats.lorsRequested || 0}</p>
              </div>
            </div>
          )}

          {/* Next Deadline */}
          {stats?.nextDeadline && (
            <div className="p-5 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-red-600" />
                <div>
                  <p className="text-xs text-red-700 font-semibold">Next Deadline</p>
                  <p className="text-lg font-bold text-red-900">
                    {new Date(stats.nextDeadline).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/students/${studentId}`, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Full Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetch(`/api/v1/students/${studentId}/essays`)
                  .then(res => res.json())
                  .then(result => {
                    if (result.success && result.data?.length > 0) {
                      toast.success(`Found ${result.data.length} essays`);
                    } else {
                      toast.info("No essays found for this student");
                    }
                  });
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              View Essays ({stats?.essaysComplete || 0})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetch(`/api/v1/students/${studentId}/colleges`)
                  .then(res => res.json())
                  .then(result => {
                    if (result.success && result.data?.length > 0) {
                      toast.success(`Found ${result.data.length} college applications`);
                    } else {
                      toast.info("No college applications found");
                    }
                  });
              }}
              className="gap-2"
            >
              <GraduationCap className="h-4 w-4" />
              View Colleges ({stats?.collegesApplied || 0})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
