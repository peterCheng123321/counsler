"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Edit, Trash2, Plus, Copy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { LORGeneratorDialog } from "./lor-generator-dialog";
import { LORViewDialog } from "./lor-view-dialog";

interface LORListProps {
  studentId: string;
  studentName: string;
}

export function LORList({ studentId, studentName }: LORListProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [showViewer, setShowViewer] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["letters", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/students/${studentId}/letters`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  const handleDelete = async (letterId: string) => {
    if (!confirm("Are you sure you want to delete this letter?")) return;

    try {
      const response = await fetch(`/api/v1/students/${studentId}/letters/${letterId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Letter deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["letters", studentId] });
      } else {
        toast.error(result.error || "Failed to delete letter");
      }
    } catch (error) {
      console.error("Error deleting letter:", error);
      toast.error("An error occurred while deleting the letter");
    }
  };

  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Letter copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleView = (letter: any) => {
    setSelectedLetter(letter);
    setShowViewer(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["letters", studentId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-text-secondary">Loading letters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Failed to load letters</p>
      </div>
    );
  }

  const letters = data || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Letters of Recommendation</h2>
          <p className="text-text-secondary">Manage recommendation letters for {studentName}</p>
        </div>
        <Button
          onClick={() => setShowGenerator(true)}
          className="gap-2 bg-primary hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Generate New Letter
        </Button>
      </div>

      {/* Letters List */}
      {letters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-text-tertiary mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No letters yet
            </h3>
            <p className="text-text-secondary text-center max-w-md mb-6">
              Generate your first letter of recommendation for {studentName} using our AI-powered tool
            </p>
            <Button
              onClick={() => setShowGenerator(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Generate First Letter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {letters.map((letter: any) => (
            <Card key={letter.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {letter.program_type || "General Recommendation"}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>{letter.relationship_type}</span>
                      <span>•</span>
                      <span>{letter.relationship_duration}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      letter.status === "finalized"
                        ? "default"
                        : letter.status === "reviewed"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {letter.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="bg-surface/50 rounded-lg p-4">
                  <p className="text-sm text-text-secondary line-clamp-3 font-serif leading-relaxed">
                    {letter.generated_content}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-text-tertiary">
                  <span>Created {format(new Date(letter.created_at), "MMM d, yyyy")}</span>
                  {letter.updated_at !== letter.created_at && (
                    <span>Updated {format(new Date(letter.updated_at), "MMM d, yyyy")}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(letter)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyToClipboard(letter.generated_content)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(letter.id)}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <LORGeneratorDialog
        open={showGenerator}
        onOpenChange={setShowGenerator}
        studentId={studentId}
        studentName={studentName}
        onSuccess={handleSuccess}
      />

      {selectedLetter && (
        <LORViewDialog
          open={showViewer}
          onOpenChange={setShowViewer}
          letter={selectedLetter}
          studentName={studentName}
        />
      )}
    </div>
  );
}
