"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  AlertCircle,
  Lightbulb,
  FileText,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  category: "grammar" | "structure" | "content" | "style" | "overall";
  severity: "high" | "medium" | "low";
  issue: string;
  suggestion: string;
  example?: string;
  // For inline highlighting - we'll try to match text
  matchText?: string;
}

interface EssayAnalysis {
  suggestions: Suggestion[];
  overall_feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
}

interface InlineEssayEditorProps {
  essayId: string;
  initialTitle: string;
  initialContent: string;
  onSave: (title: string, content: string) => Promise<void>;
}

export function InlineEssayEditor({
  essayId,
  initialTitle,
  initialContent,
  onSave,
}: InlineEssayEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState<EssayAnalysis | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    // Clear analysis when content changes significantly
    if (analysis) {
      setAnalysis(null);
    }
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

      if (!response.ok) {
        toast.error(`Failed to analyze essay: ${response.status}`);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setAnalysis(result.data);
        toast.success("Analysis complete!");
      } else {
        toast.error(result.error || "Failed to analyze essay");
      }
    } catch (error) {
      console.error("Error getting suggestions:", error);
      toast.error(`Failed to get suggestions`);
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
    high: "bg-red-100 border-red-500 text-red-900",
    medium: "bg-amber-100 border-amber-500 text-amber-900",
    low: "bg-blue-100 border-blue-500 text-blue-900",
  };

  const categoryIcons = {
    grammar: AlertCircle,
    structure: FileText,
    content: Lightbulb,
    style: Sparkles,
    overall: Sparkles,
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  // Render content with inline highlights
  const renderContentWithHighlights = () => {
    if (!analysis || !analysis.suggestions.length) {
      return content;
    }

    // Split content into sentences for highlighting
    const sentences = content.split(/([.!?]+\s+)/);

    return (
      <div className="space-y-4">
        {sentences.map((sentence, idx) => {
          // Check if any suggestion might apply to this sentence
          const relevantSuggestion = analysis.suggestions.find((s, suggestionIdx) => {
            // Try to match based on keywords in the issue
            const issueKeywords = s.issue.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const sentenceLower = sentence.toLowerCase();
            return issueKeywords.some(keyword => sentenceLower.includes(keyword));
          });

          if (relevantSuggestion) {
            const suggestionIdx = analysis.suggestions.indexOf(relevantSuggestion);
            const isSelected = selectedSuggestionIndex === suggestionIdx;

            return (
              <div key={idx} className="relative group">
                <span
                  className={`${
                    severityColors[relevantSuggestion.severity]
                  } border-b-2 cursor-pointer hover:bg-opacity-70 transition-colors px-1 rounded`}
                  onClick={() => setSelectedSuggestionIndex(isSelected ? null : suggestionIdx)}
                >
                  {sentence}
                </span>
                {isSelected && (
                  <div className="absolute left-0 top-full mt-2 w-96 bg-white border-2 border-primary rounded-lg shadow-2xl z-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={severityColors[relevantSuggestion.severity]}>
                        {relevantSuggestion.severity} - {relevantSuggestion.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSuggestionIndex(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="font-semibold text-sm mb-1">{relevantSuggestion.issue}</p>
                    <p className="text-xs text-text-secondary mb-2">{relevantSuggestion.suggestion}</p>
                    {relevantSuggestion.example && (
                      <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                        <strong>Example:</strong> {relevantSuggestion.example}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return <span key={idx}>{sentence}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white border border-border rounded-lg p-4 shadow-sm">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Essay Title..."
            className="text-2xl font-bold border-none outline-none focus:ring-0 bg-transparent w-full"
          />
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Unsaved
            </Badge>
          )}
          <Badge variant="outline">{wordCount} words</Badge>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            size="sm"
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* AI Analysis Buttons */}
      <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">AI Analysis</span>
            <span className="text-sm text-text-secondary">Click to analyze your essay</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => getSuggestions("grammar")} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => getSuggestions("structure")} disabled={isAnalyzing}>
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => getSuggestions("content")} disabled={isAnalyzing}>
              <Lightbulb className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => getSuggestions("overall")} disabled={isAnalyzing}>
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Essay Editor with Inline Suggestions */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="relative">
            {analysis ? (
              <div className="min-h-[calc(100vh-350px)] p-8 font-serif text-lg leading-relaxed">
                {renderContentWithHighlights()}
              </div>
            ) : (
              <textarea
                ref={contentRef as any}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start writing your essay here..."
                className="min-h-[calc(100vh-350px)] w-full border-none font-serif text-lg leading-relaxed p-8 resize-none focus:outline-none focus:ring-0"
              />
            )}
            {analysis && (
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAnalysis(null)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear highlights
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Panel */}
      {analysis && (
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Analysis Summary
            </h3>
            <div className="space-y-4">
              {analysis.overall_feedback && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm"><strong>Overall:</strong> {analysis.overall_feedback}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-green-700 mb-2">Strengths ({analysis.strengths.length})</p>
                  <ul className="text-sm space-y-1">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-green-600">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-700 mb-2">Areas to Improve ({analysis.areas_for_improvement.length})</p>
                  <ul className="text-sm space-y-1">
                    {analysis.areas_for_improvement.map((a, i) => (
                      <li key={i} className="text-amber-600">• {a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
