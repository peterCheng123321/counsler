"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Download, Copy, Edit2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LORViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letter: any;
  studentName: string;
}

export function LORViewDialog({
  open,
  onOpenChange,
  letter,
  studentName,
}: LORViewDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(letter.generated_content || "");
  const [status, setStatus] = useState(letter.status || "draft");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(letter.generated_content || "");
    setStatus(letter.status || "draft");
    setIsEditing(false);
  }, [letter]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/v1/students/${letter.student_id}/letters/${letter.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            program_type: letter.program_type,
            relationship_type: letter.relationship_type,
            relationship_duration: letter.relationship_duration,
            relationship_context: letter.relationship_context,
            specific_examples: letter.specific_examples,
            generated_content: content,
            status: status,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Letter saved successfully");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to save letter");
      }
    } catch (error) {
      console.error("Error saving letter:", error);
      toast.error("An error occurred while saving the letter");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Letter copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LOR_${studentName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Letter downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                {letter.program_type || "Letter of Recommendation"}
              </DialogTitle>
              <p className="text-sm text-text-secondary">
                for {studentName} • {letter.relationship_type} • {letter.relationship_duration}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={setStatus} disabled={!isEditing}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-text-tertiary pb-2 border-b border-border/40">
            <span>Created {format(new Date(letter.created_at), "MMMM d, yyyy 'at' h:mm a")}</span>
            {letter.updated_at !== letter.created_at && (
              <>
                <span>•</span>
                <span>Updated {format(new Date(letter.updated_at), "MMMM d, yyyy 'at' h:mm a")}</span>
              </>
            )}
          </div>

          {/* Content */}
          <div className="space-y-3">
            {isEditing ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[500px] text-base font-serif leading-relaxed"
              />
            ) : (
              <div className="bg-surface/30 rounded-lg p-6 border border-border/40">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-serif text-base leading-relaxed text-text-primary">
                    {content}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Context Info (collapsible) */}
          {letter.relationship_context && (
            <details className="bg-surface/20 rounded-lg p-4 border border-border/30">
              <summary className="cursor-pointer font-semibold text-sm text-text-secondary hover:text-text-primary">
                View Generation Context
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="font-medium">Relationship Context:</span>
                  <p className="text-text-secondary mt-1">{letter.relationship_context}</p>
                </div>
                {letter.specific_examples && (
                  <div>
                    <span className="font-medium">Specific Examples Used:</span>
                    <pre className="text-text-secondary mt-1 whitespace-pre-wrap font-mono text-xs">
                      {letter.specific_examples}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/40">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setContent(letter.generated_content);
                      setStatus(letter.status);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2 bg-primary hover:bg-primary-hover"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
