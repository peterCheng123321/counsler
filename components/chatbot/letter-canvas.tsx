"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  X,
  Save,
  Loader2,
  FileText,
  Maximize2,
  Minimize2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Mail,
  GraduationCap,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface Letter {
  id: string;
  student_id: string;
  counselor_id: string;
  student_college_id?: string;
  program_type?: string;
  relationship_type?: string;
  relationship_duration?: string;
  relationship_context?: string;
  specific_examples?: string;
  generated_content: string;
  status: "draft" | "completed" | "sent";
  created_at: string;
  updated_at: string;
  student?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  college?: {
    name: string;
  };
}

interface LetterCanvasProps {
  letterId: string;
  studentId: string;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function LetterCanvas({
  letterId,
  studentId,
  onClose,
  isExpanded = false,
  onToggleExpand,
}: LetterCanvasProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [programType, setProgramType] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch letter data
  const { data: letter, isLoading, refetch } = useQuery({
    queryKey: ["letter", letterId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/students/${studentId}/letters/${letterId}`);
      if (!response.ok) throw new Error("Failed to load letter");
      const result = await response.json();
      if (!result.success || !result.data) throw new Error("Letter not found");
      return result.data as Letter;
    },
    refetchInterval: 15000,
    staleTime: 10000,
    retry: 1,
  });

  // Initialize content when letter data loads
  useEffect(() => {
    if (letter && !hasUnsavedChanges) {
      setContent(letter.generated_content || "");
      setProgramType(letter.program_type || "");
    }
  }, [letter, hasUnsavedChanges]);

  const saveLetter = async () => {
    if (!letter) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/students/${studentId}/letters/${letterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generated_content: content,
          program_type: programType,
        }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        toast.success("Letter saved successfully!");

        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ["letter", letterId] });
        queryClient.invalidateQueries({ queryKey: ["letters"] });
        queryClient.invalidateQueries({ queryKey: ["student", studentId] });
        refetch();
      } else {
        toast.error("Failed to save letter");
      }
    } catch (error) {
      console.error("Error saving letter:", error);
      toast.error("Failed to save letter");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Letter data refreshed");
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const statusColors = {
    draft: "bg-gray-100 text-gray-700 border-gray-300",
    completed: "bg-green-100 text-green-700 border-green-300",
    sent: "bg-blue-100 text-blue-700 border-blue-300",
  };

  if (isLoading) {
    return (
      <div className={`${isExpanded ? "fixed inset-4 z-50" : "h-full"} flex flex-col bg-white rounded-xl shadow-lg`}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className={`${isExpanded ? "fixed inset-4 z-50" : "h-full"} flex flex-col bg-white rounded-xl shadow-lg`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-text-secondary">Letter not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isExpanded ? "fixed inset-4 z-50 bg-white rounded-xl shadow-2xl" : "h-full bg-white rounded-xl border border-border"} flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className="flex-none border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Letter of Recommendation
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    Unsaved Changes
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                {letter.student && (
                  <>
                    <GraduationCap className="h-4 w-4" />
                    {letter.student.first_name} {letter.student.last_name}
                  </>
                )}
                {letter.college && (
                  <>
                    <span className="text-gray-400">•</span>
                    <Building2 className="h-4 w-4" />
                    {letter.college.name}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="hover:bg-white/50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleExpand}
                className="hover:bg-white/50"
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex-none border-b border-border bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <Badge
              className={`${statusColors[letter.status]} border font-medium`}
            >
              {letter.status.charAt(0).toUpperCase() + letter.status.slice(1)}
            </Badge>
            <span className="text-gray-600">
              {wordCount} words
            </span>
            {letter.relationship_type && (
              <span className="text-gray-600">
                Relationship: {letter.relationship_type}
              </span>
            )}
          </div>

          <Button
            onClick={saveLetter}
            disabled={!hasUnsavedChanges || isSaving}
            size="sm"
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Letter
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Program Type (Optional) */}
      {programType && (
        <div className="flex-none border-b border-border bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-500" />
            <Input
              value={programType}
              onChange={(e) => {
                setProgramType(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Program/Major (e.g., Computer Science)"
              className="flex-1 max-w-md"
            />
          </div>
        </div>
      )}

      {/* Letter Content Editor */}
      <div className="flex-1 overflow-auto p-6">
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="min-h-[600px] font-serif text-base leading-relaxed resize-none border-0 focus:ring-0 focus-visible:ring-0"
          placeholder="Letter content will appear here..."
        />
      </div>

      {/* Footer */}
      <div className="flex-none border-t border-border bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            Last updated: {new Date(letter.updated_at).toLocaleString()}
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>You have unsaved changes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
