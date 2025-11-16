"use client";

import { useState } from "react";
import { Lightbulb, RefreshCw, CheckCircle, AlertCircle, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Student } from "@/lib/api/client";

interface AIGuidanceProps {
  student: Student;
}

interface GuidanceItem {
  type: "strength" | "improvement" | "action" | "focus";
  title: string;
  description: string;
  priority?: "high" | "medium" | "low";
}

export function AIGuidance({ student }: AIGuidanceProps) {
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState<GuidanceItem[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateGuidance = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Analyze ${student.first_name} ${student.last_name}'s profile and provide specific guidance for the counselor. Include: 1) Key strengths to leverage, 2) Areas needing immediate attention, 3) Specific action items, 4) What to focus on in the next session. Consider their GPA: ${student.gpa_unweighted || "N/A"}, SAT: ${student.sat_score || "N/A"}, ACT: ${student.act_score || "N/A"}, and ${student.application_progress}% application progress. Format as JSON array with: type (strength/improvement/action/focus), title, description, priority (high/medium/low).`,
          stream: false,
          studentContext: {
            id: student.id,
            name: `${student.first_name} ${student.last_name}`,
            firstName: student.first_name,
            lastName: student.last_name,
            graduationYear: student.graduation_year,
            gpa: student.gpa_unweighted,
            sat: student.sat_score,
            act: student.act_score,
            progress: student.application_progress,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to generate guidance");

      const data = await response.json();
      const parsedGuidance = parseGuidance(data.data.message, student);
      setGuidance(parsedGuidance);
      setHasGenerated(true);

      toast.success("AI guidance generated!");
    } catch (error) {
      console.error("Error generating guidance:", error);
      toast.error("Failed to generate guidance");

      // Fallback to generated guidance based on profile
      setGuidance(generateFallbackGuidance(student));
      setHasGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const parseGuidance = (message: string, student: Student): GuidanceItem[] => {
    try {
      const jsonMatch = message.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse guidance:", e);
    }

    return generateFallbackGuidance(student);
  };

  const generateFallbackGuidance = (student: Student): GuidanceItem[] => {
    const items: GuidanceItem[] = [];
    const progress = student.application_progress || 0;
    const gpa = student.gpa_unweighted || 0;
    const hasSAT = !!student.sat_score;
    const hasACT = !!student.act_score;

    // Strengths
    if (gpa >= 3.7) {
      items.push({
        type: "strength",
        title: "Strong Academic Performance",
        description: `${student.first_name}'s GPA of ${gpa.toFixed(2)} is competitive for top-tier schools. Emphasize this in applications.`,
        priority: "high",
      });
    }

    if (progress >= 75) {
      items.push({
        type: "strength",
        title: "Excellent Application Progress",
        description: "Student is well ahead of schedule. Use extra time for essay refinement and interview prep.",
        priority: "medium",
      });
    }

    // Areas for improvement
    if (!hasSAT && !hasACT) {
      items.push({
        type: "improvement",
        title: "Standardized Test Scores Missing",
        description: "No SAT or ACT scores recorded. Schedule test dates immediately or consider test-optional schools.",
        priority: "high",
      });
    }

    if (progress < 50) {
      items.push({
        type: "improvement",
        title: "Application Progress Behind Schedule",
        description: `At ${progress}% complete, ${student.first_name} needs to accelerate their application timeline.`,
        priority: "high",
      });
    }

    if (gpa < 3.0) {
      items.push({
        type: "improvement",
        title: "GPA Enhancement Strategies Needed",
        description: "Focus on explaining grade trends in essays and highlighting non-academic strengths.",
        priority: "high",
      });
    }

    // Action items
    items.push({
      type: "action",
      title: "Review Essay Drafts",
      description: "Schedule a dedicated session to review and refine personal statement and supplemental essays.",
      priority: progress < 50 ? "high" : "medium",
    });

    items.push({
      type: "action",
      title: "Request Letters of Recommendation",
      description: "Ensure at least 2-3 teachers have been asked for recommendation letters with proper lead time.",
      priority: "high",
    });

    // Focus areas
    items.push({
      type: "focus",
      title: "Next Session Focus",
      description: progress < 50
        ? "Priority: Complete Common App and finalize college list"
        : "Priority: Polish essays and prepare for interviews",
      priority: "high",
    });

    if (gpa >= 3.5 && (hasSAT || hasACT)) {
      items.push({
        type: "focus",
        title: "Scholarship Opportunities",
        description: "Strong profile for merit scholarships. Research and apply to relevant programs.",
        priority: "medium",
      });
    }

    return items;
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "strength": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "improvement": return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "action": return <Target className="h-4 w-4 text-blue-600" />;
      case "focus": return <Lightbulb className="h-4 w-4 text-purple-600" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high": return "error";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Counselor Guidance
          </CardTitle>
          {!hasGenerated && (
            <Button
              onClick={generateGuidance}
              disabled={loading}
              size="sm"
            >
              {loading ? "Analyzing..." : "Get Guidance"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!hasGenerated && !loading && (
          <div className="text-center py-6">
            <Lightbulb className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              Get AI-powered guidance on how to best support {student.first_name}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}

        {hasGenerated && guidance.length > 0 && (
          <div className="space-y-3">
            {guidance.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="mt-1">{getItemIcon(item.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-text-primary">
                      {item.title}
                    </h4>
                    {item.priority && (
                      <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                        {item.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}

            <div className="mt-3 pt-3 border-t">
              <Button
                onClick={generateGuidance}
                variant="ghost"
                size="sm"
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Guidance
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}