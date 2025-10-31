/**
 * Essay Suggestions API
 * Gets AI-powered suggestions for essay improvements
 */

import { NextRequest, NextResponse } from "next/server";
import { createLLM } from "@/lib/ai/llm-factory";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: essayId } = await params;
    const body = await request.json();
    const { essay_text, prompt_type } = body;

    if (!essay_text) {
      return NextResponse.json(
        { error: "Essay text is required" },
        { status: 400 }
      );
    }

    // Fetch essay and student data to provide context
    const supabase = createAdminClient();
    const { data: essay } = await supabase
      .from("essays")
      .select(`
        *,
        students (
          first_name,
          last_name,
          graduation_year,
          gpa_unweighted,
          gpa_weighted,
          sat_score,
          act_score,
          application_progress
        )
      `)
      .eq("id", essayId)
      .single();

    const student = essay?.students;
    let studentContext = "";

    if (student) {
      studentContext = `\n\nSTUDENT PROFILE CONTEXT:
- Name: ${student.first_name} ${student.last_name}
- Graduation Year: ${student.graduation_year || "Not specified"}
- GPA (Unweighted): ${student.gpa_unweighted || "Not specified"}
- GPA (Weighted): ${student.gpa_weighted || "Not specified"}
- SAT Score: ${student.sat_score || "Not specified"}
- ACT Score: ${student.act_score || "Not specified"}
- Application Progress: ${student.application_progress || 0}%

Use this student profile to provide personalized feedback that considers their academic background and application stage.`;
    }

    // Create system prompt based on suggestion type
    const systemPrompts = {
      grammar: "You are an expert English teacher. Analyze the essay for grammar, spelling, and punctuation errors. Provide specific suggestions for corrections.",
      structure: "You are an expert college admissions essay consultant. Analyze the essay's structure, flow, and organization. Suggest improvements for better coherence and impact.",
      content: "You are an expert college admissions counselor. Analyze the essay's content, narrative, and storytelling. Suggest ways to make it more compelling and personal.",
      overall: "You are an expert college admissions essay consultant. Provide a comprehensive review covering grammar, structure, content, and overall impact. Give actionable suggestions for improvement.",
    };

    const systemPrompt = systemPrompts[prompt_type as keyof typeof systemPrompts] || systemPrompts.overall;

    const userPrompt = `Please analyze this college application essay and provide detailed suggestions for improvement:

${essay_text}${studentContext}

IMPORTANT: Respond ONLY with valid JSON in exactly this format (no markdown, no code blocks, just pure JSON):
{
  "suggestions": [
    {
      "category": "grammar",
      "severity": "high",
      "issue": "Brief description of the issue",
      "suggestion": "Specific suggestion for improvement",
      "example": "Optional example of how to fix it"
    }
  ],
  "overall_feedback": "Brief overall assessment (2-3 sentences)",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "areas_for_improvement": ["Area 1", "Area 2", "Area 3"]
}

Category must be one of: grammar, structure, content, style
Severity must be one of: high, medium, low

Provide at least 3-5 suggestions, 3 strengths, and 3 areas for improvement.`;

    // Call AI
    const llm = createLLM({
      temperature: 0.3,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // Try to parse JSON response with improved extraction
    let suggestions;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      // Try to find JSON object
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          suggestions = {
            suggestions: parsed.suggestions.map((s: any) => ({
              category: s.category || "overall",
              severity: s.severity || "medium",
              issue: s.issue || "Review needed",
              suggestion: s.suggestion || "",
              example: s.example || "",
            })),
            overall_feedback: parsed.overall_feedback || "Analysis complete",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            areas_for_improvement: Array.isArray(parsed.areas_for_improvement)
              ? parsed.areas_for_improvement
              : [],
          };
        } else {
          throw new Error("Invalid JSON structure");
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[Essay API] JSON parse error:", parseError);
      // Return structured fallback with the raw content
      suggestions = {
        suggestions: [
          {
            category: "content",
            severity: "medium",
            issue: "AI analysis completed",
            suggestion: content.substring(0, 500),
            example: ""
          }
        ],
        overall_feedback: "The AI provided feedback in an unexpected format. Please review the suggestion above.",
        strengths: ["Your essay shows effort and thought"],
        areas_for_improvement: ["Consider reviewing the AI's raw feedback for specific suggestions"]
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...suggestions,
        student_context: student ? {
          name: `${student.first_name} ${student.last_name}`,
          graduation_year: student.graduation_year,
          gpa_unweighted: student.gpa_unweighted,
          gpa_weighted: student.gpa_weighted,
          sat_score: student.sat_score,
          act_score: student.act_score,
          application_progress: student.application_progress,
        } : null
      },
    });

  } catch (error) {
    console.error("[Essay Suggestions API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate suggestions",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
