"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Essay } from "@/lib/types/database";

interface EssayCanvasProps {
  essayId: string;
  studentId?: string;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function EssayCanvas({
  essayId,
  studentId,
  onClose,
  isExpanded = false,
  onToggleExpand,
}: EssayCanvasProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use React Query for real-time data fetching with auto-refresh
  const { data: essay, isLoading, refetch } = useQuery({
    queryKey: ["essay", essayId],
    queryFn: async () => {
      // First try to fetch the essay directly
      let response = await fetch(`/api/v1/essays/${essayId}`);

      // If direct fetch doesn't work, try through student endpoint
      if (!response.ok && studentId) {
        response = await fetch(`/api/v1/students/${studentId}/essays`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const foundEssay = result.data.find((e: Essay) => e.id === essayId);
            if (foundEssay) {
              return foundEssay as Essay;
            }
          }
        }
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data as Essay;
        }
      }

      throw new Error("Essay not found");
    },
    refetchInterval: 15000, // Auto-refresh every 15 seconds (reduced from 5s)
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 1,
  });

  // Initialize title and content when essay data loads
  useEffect(() => {
    if (essay && !hasUnsavedChanges) {
      setTitle(essay.title || "");
      setContent(essay.content || "");
    }
  }, [essay, hasUnsavedChanges]);

  const saveEssay = async () => {
    if (!essay) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/essays/${essayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          word_count: content.trim().split(/\s+/).filter(Boolean).length,
        }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        toast.success("Essay saved successfully!");

        // Invalidate and refetch to get latest data
        queryClient.invalidateQueries({ queryKey: ["essay", essayId] });
        queryClient.invalidateQueries({ queryKey: ["essays"] });
        if (studentId) {
          queryClient.invalidateQueries({ queryKey: ["student", studentId] });
          queryClient.invalidateQueries({ queryKey: ["student-stats", studentId] });
        }
        refetch();
      } else {
        toast.error("Failed to save essay");
      }
    } catch (error) {
      console.error("Error saving essay:", error);
      toast.error("Failed to save essay");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Essay data refreshed");
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const statusColors = {
    draft: "bg-gray-100 text-gray-700 border-gray-300",
    in_review: "bg-blue-100 text-blue-700 border-blue-300",
    completed: "bg-green-100 text-green-700 border-green-300",
  };

  if (isLoading) {
    return (
      <div className={`${isExpanded ? "fixed inset-4 z-50" : "h-full"} flex flex-col bg-white shadow-lg`}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-text-secondary">Loading essay...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!essay) {
    return (
      <div className={`${isExpanded ? "fixed inset-4 z-50" : "h-full"} flex flex-col bg-white shadow-lg`}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="text-text-secondary">Essay not found</p>
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
      isExpanded
        ? "fixed inset-4 z-50"
        : "h-full"
    } flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out overflow-hidden`}>
      {/* Header */}
      <div className="flex-none border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Essay Title..."
                className="text-lg font-bold border-none outline-none focus:ring-0 bg-transparent w-full text-text-primary placeholder:text-text-tertiary/50 truncate"
              />
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${statusColors[essay.status]} text-xs capitalize`}>
                  {essay.status.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-text-tertiary">{wordCount} words</span>
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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

            <Button
              onClick={saveEssay}
              disabled={isSaving || !hasUnsavedChanges}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary-hover text-white"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>

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

            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Essay Content - Full Height Scrollable Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {essay.prompt && (
            <div className="p-6 bg-blue-50 border-b-2 border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-1">Essay Prompt</p>
              <p className="text-sm text-blue-900 leading-relaxed">{essay.prompt}</p>
            </div>
          )}

          <div className="relative flex-1">
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing your essay here..."
              className="h-full w-full border-none font-serif text-base leading-relaxed p-8 resize-none focus-visible:ring-0 bg-white"
            />
            <div className="absolute bottom-4 right-4 text-xs text-text-tertiary bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
              {wordCount > 0 ? `${wordCount} words` : "Start typing..."}
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        {essay.feedback && (
          <div className="border-t-2 border-border/50 p-6 bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-green-800 mb-1">Counselor Feedback</p>
                <p className="text-sm text-green-900 leading-relaxed">{essay.feedback}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="border-t-2 border-border/50 p-4 bg-surface/30">
          <div className="flex gap-2 flex-wrap">
            {studentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/students/${studentId}`, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Student Profile
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/essays/${essayId}`, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Full Editor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
