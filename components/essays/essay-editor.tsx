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
      const response = await fetch(`/api/v1/essays/${essayId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay_text: content,
          prompt_type: promptType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data);
        toast.success("Analysis complete!");
      } else {
        toast.error(result.error || "Failed to analyze essay");
      }
    } catch (error) {
      console.error("Error getting suggestions:", error);
      toast.error("Failed to get suggestions");
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Essay Editor */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Essay Content</CardTitle>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Unsaved changes
                  </Badge>
                )}
                <Badge variant="outline">{wordCount} words</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Essay Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter essay title..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Essay Content
              </label>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Write your essay here..."
                className="min-h-[400px] font-serif text-base leading-relaxed"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Essay
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => getSuggestions("grammar")}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                Grammar
              </Button>
              <Button
                variant="outline"
                onClick={() => getSuggestions("structure")}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Structure
              </Button>
              <Button
                variant="outline"
                onClick={() => getSuggestions("content")}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                Content
              </Button>
              <Button
                variant="outline"
                onClick={() => getSuggestions("overall")}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Overall
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions Panel */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            {!analysis ? (
              <div className="text-center py-12 text-text-secondary">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No analysis yet</p>
                <p className="text-sm">
                  Click an analysis button to get AI-powered suggestions
                </p>
              </div>
            ) : (
              <Tabs defaultValue="suggestions" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="suggestions">
                    Suggestions ({analysis.suggestions.length})
                  </TabsTrigger>
                  <TabsTrigger value="strengths">
                    Strengths ({analysis.strengths.length})
                  </TabsTrigger>
                  <TabsTrigger value="improve">
                    Improve ({analysis.areas_for_improvement.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="suggestions" className="space-y-3 max-h-[600px] overflow-y-auto">
                  {analysis.suggestions.map((suggestion, index) => {
                    const Icon = categoryIcons[suggestion.category];
                    return (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-2 bg-surface/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <Badge variant="outline" className="capitalize">
                              {suggestion.category}
                            </Badge>
                          </div>
                          <Badge className={severityColors[suggestion.severity]}>
                            {suggestion.severity}
                          </Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-text-primary text-sm mb-1">
                            {suggestion.issue}
                          </p>
                          <p className="text-sm text-text-secondary">
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

                <TabsContent value="strengths" className="space-y-2 max-h-[600px] overflow-y-auto">
                  {analysis.strengths.length === 0 ? (
                    <p className="text-text-secondary text-sm text-center py-8">
                      No strengths identified yet
                    </p>
                  ) : (
                    analysis.strengths.map((strength, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-green-800">{strength}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="improve" className="space-y-2 max-h-[600px] overflow-y-auto">
                  {analysis.areas_for_improvement.length === 0 ? (
                    <p className="text-text-secondary text-sm text-center py-8">
                      No areas for improvement identified yet
                    </p>
                  ) : (
                    analysis.areas_for_improvement.map((area, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                      >
                        <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800">{area}</p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}

            {analysis && (
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-semibold text-primary mb-2">
                  Overall Feedback
                </p>
                <p className="text-sm text-text-secondary">
                  {analysis.overall_feedback}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
