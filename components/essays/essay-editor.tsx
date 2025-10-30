"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  FileText,
  Loader2,
  Save,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  category: "grammar" | "structure" | "content" | "style" | "overall";
  severity: "high" | "medium" | "low";
  issue: string;
  suggestion: string;
  example?: string;
}

interface EssayAnalysis {
  suggestions: Suggestion[];
  overall_feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
}

interface EssayEditorProps {
  essayId: string;
  initialTitle: string;
  initialContent: string;
  onSave: (title: string, content: string) => Promise<void>;
}

export function EssayEditor({
  essayId,
  initialTitle,
  initialContent,
  onSave,
}: EssayEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState<EssayAnalysis | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const getSuggestions = async (promptType: string) => {
    if (!content.trim()) {
      toast.error("Please enter essay content first");
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log("Fetching suggestions for prompt type:", promptType);
      console.log("Essay content length:", content.length);

      const response = await fetch(`/api/v1/essays/${essayId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay_text: content,
          prompt_type: promptType,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        toast.error(`Failed to analyze essay: ${response.status}`);
        return;
      }

      const result = await response.json();
      console.log("Received result:", result);

      if (result.success && result.data) {
        console.log("Setting analysis data:", result.data);
        setAnalysis(result.data);
        toast.success("Analysis complete!");
      } else {
        console.error("Result not successful:", result);
        toast.error(result.error || "Failed to analyze essay");
      }
    } catch (error) {
      console.error("Error getting suggestions:", error);
      toast.error(`Failed to get suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(title, content);
      setHasUnsavedChanges(false);
      toast.success("Essay saved successfully");
    } catch (error) {
      toast.error("Failed to save essay");
    } finally {
      setIsSaving(false);
    }
  };

  const severityColors = {
    high: "bg-red-100 text-red-700 border-red-300",
    medium: "bg-amber-100 text-amber-700 border-amber-300",
    low: "bg-blue-100 text-blue-700 border-blue-300",
  };

  const categoryIcons = {
    grammar: AlertCircle,
    structure: FileText,
    content: Lightbulb,
    style: Sparkles,
    overall: CheckCircle,
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Main Editor */}
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-white border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Essay Title..."
                className="text-2xl font-bold border-none outline-none focus:ring-0 bg-transparent w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Unsaved changes
              </Badge>
            )}
            <Badge variant="outline">{wordCount} words</Badge>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="gap-2"
              size="sm"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* AI Analysis Actions */}
        <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">AI Analysis</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => getSuggestions("grammar")}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                Grammar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getSuggestions("structure")}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Structure
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getSuggestions("content")}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                Content
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getSuggestions("overall")}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Overall
              </Button>
            </div>
          </div>
        </div>

        {/* Essay Content Editor */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing your essay here..."
              className="min-h-[calc(100vh-320px)] border-none font-serif text-lg leading-relaxed p-8 resize-none focus-visible:ring-0"
            />
          </CardContent>
        </Card>
      </div>

      {/* Floating Suggestions Panel */}
      {analysis && (
        <div className="fixed top-4 right-4 w-96 max-h-[calc(100vh-2rem)] bg-white border border-border rounded-lg shadow-2xl overflow-hidden z-50 animate-in slide-in-from-right">
          <div className="bg-primary/5 border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-text-primary">AI Suggestions</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnalysis(null)}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
            <Tabs defaultValue="suggestions" className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                <TabsTrigger value="suggestions" className="rounded-none">
                  Suggestions ({analysis.suggestions.length})
                </TabsTrigger>
                <TabsTrigger value="strengths" className="rounded-none">
                  Strengths ({analysis.strengths.length})
                </TabsTrigger>
                <TabsTrigger value="improve" className="rounded-none">
                  Improve ({analysis.areas_for_improvement.length})
                </TabsTrigger>
              </TabsList>

              <div className="p-4">
                <TabsContent value="suggestions" className="space-y-3 mt-0">
                  {analysis.suggestions.map((suggestion, index) => {
                    const Icon = categoryIcons[suggestion.category];
                    return (
                      <div
                        key={index}
                        className="border rounded-lg p-3 space-y-2 bg-surface/50 hover:bg-surface transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <Badge variant="outline" className="capitalize text-xs">
                              {suggestion.category}
                            </Badge>
                          </div>
                          <Badge className={`${severityColors[suggestion.severity]} text-xs`}>
                            {suggestion.severity}
                          </Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-text-primary text-sm mb-1">
                            {suggestion.issue}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {suggestion.suggestion}
                          </p>
                          {suggestion.example && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800 border border-blue-200">
                              <strong>Example:</strong> {suggestion.example}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="strengths" className="space-y-2 mt-0">
                  {analysis.strengths.length === 0 ? (
                    <p className="text-text-secondary text-sm text-center py-8">
                      No strengths identified yet
                    </p>
                  ) : (
                    analysis.strengths.map((strength, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-green-800">{strength}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="improve" className="space-y-2 mt-0">
                  {analysis.areas_for_improvement.length === 0 ? (
                    <p className="text-text-secondary text-sm text-center py-8">
                      No areas for improvement identified yet
                    </p>
                  ) : (
                    analysis.areas_for_improvement.map((area, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                      >
                        <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-800">{area}</p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </div>
            </Tabs>

            {analysis.overall_feedback && (
              <div className="p-4 border-t bg-primary/5">
                <p className="text-xs font-semibold text-primary mb-2">
                  Overall Feedback
                </p>
                <p className="text-xs text-text-secondary">
                  {analysis.overall_feedback}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
