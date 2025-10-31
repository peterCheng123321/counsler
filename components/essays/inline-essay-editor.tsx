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
  student_context?: {
    name: string;
    graduation_year?: number;
    gpa_unweighted?: number;
    gpa_weighted?: number;
    sat_score?: number;
    act_score?: number;
    application_progress?: number;
  };
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
    <div className="space-y-6">
      {/* Header Bar - Enhanced Design */}
      <div className="bg-gradient-to-r from-white to-primary/5 border-2 border-border rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="flex-1 mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter your essay title..."
            className="text-3xl font-bold border-none outline-none focus:ring-0 bg-transparent w-full text-text-primary placeholder:text-text-tertiary/40"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border/30 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{wordCount} words</span>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Unsaved changes</span>
              </div>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            size="sm"
            className="gap-2 bg-primary hover:bg-primary-hover text-white shadow-md hover:shadow-lg transition-all duration-300"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Essay"}
          </Button>
        </div>
      </div>

      {/* AI Analysis Button - Consolidated & Enhanced */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-white border-2 border-primary/30 rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 hover:border-primary/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-text-primary flex items-center gap-2">
                AI-Powered Analysis
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  Beta
                </Badge>
              </div>
              <p className="text-sm text-text-secondary">Get comprehensive feedback on grammar, structure, and content</p>
            </div>
          </div>
          <Button
            onClick={() => getSuggestions("overall")}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Analyzing Your Essay...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Analyze Essay
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Essay Editor with Inline Suggestions - Enhanced Design */}
      <Card className="shadow-xl border-2 border-border hover:border-primary/30 transition-all duration-300">
        <CardContent className="p-0">
          <div className="relative">
            {analysis ? (
              <div className="min-h-[calc(100vh-350px)] p-10 font-serif text-lg leading-relaxed bg-gradient-to-br from-white to-primary/5">
                {renderContentWithHighlights()}
              </div>
            ) : (
              <div className="relative">
                <textarea
                  ref={contentRef as any}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing your essay here... Let your thoughts flow freely."
                  className="min-h-[calc(100vh-350px)] w-full border-none font-serif text-lg leading-relaxed p-10 resize-none focus:outline-none focus:ring-0 bg-white placeholder:text-text-tertiary/50 focus:placeholder:text-text-tertiary/30 transition-all duration-300"
                />
                <div className="absolute bottom-4 right-4 text-xs text-text-tertiary bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
                  {wordCount > 0 ? `${wordCount} words written` : "Start typing..."}
                </div>
              </div>
            )}
            {analysis && (
              <div className="absolute top-4 right-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnalysis(null)}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-md border-border/50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Analysis
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Panel - Enhanced Design */}
      {analysis && (
        <Card className="shadow-xl border-2 border-primary/30 bg-gradient-to-br from-white to-primary/5 animate-in slide-in-from-top-4 duration-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/20">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">AI Analysis Results</h3>
            </div>

            {/* Student Context Info */}
            {analysis.student_context && (
              <div className="mb-5 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900 mb-2">Analysis Context</p>
                    <p className="text-xs text-blue-700 mb-3">
                      This analysis is personalized based on <strong>{analysis.student_context.name}'s</strong> academic profile:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {analysis.student_context.graduation_year && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-blue-800">Class of {analysis.student_context.graduation_year}</span>
                        </div>
                      )}
                      {analysis.student_context.gpa_weighted && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-blue-800">GPA: {analysis.student_context.gpa_weighted}</span>
                        </div>
                      )}
                      {analysis.student_context.sat_score && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-blue-800">SAT: {analysis.student_context.sat_score}</span>
                        </div>
                      )}
                      {analysis.student_context.act_score && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-blue-800">ACT: {analysis.student_context.act_score}</span>
                        </div>
                      )}
                      {analysis.student_context.application_progress !== undefined && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-blue-800">Progress: {analysis.student_context.application_progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {analysis.overall_feedback && (
                <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border-2 border-primary/30 shadow-sm">
                  <p className="text-sm font-semibold text-primary mb-1">Overall Feedback</p>
                  <p className="text-sm text-text-primary leading-relaxed">{analysis.overall_feedback}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-bold text-green-800">Strengths ({analysis.strengths.length})</p>
                  </div>
                  <ul className="text-sm space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-green-700 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                    <p className="text-sm font-bold text-amber-800">Areas to Improve ({analysis.areas_for_improvement.length})</p>
                  </div>
                  <ul className="text-sm space-y-2">
                    {analysis.areas_for_improvement.map((a, i) => (
                      <li key={i} className="text-amber-700 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">→</span>
                        <span>{a}</span>
                      </li>
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
