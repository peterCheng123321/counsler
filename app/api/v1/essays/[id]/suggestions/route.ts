/**
 * Essay Suggestions API
 * Gets AI-powered suggestions for essay improvements
 */

import { NextRequest, NextResponse } from "next/server";
import { createLLM } from "@/lib/ai/llm-factory";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { essay_text, prompt_type } = body;

    if (!essay_text) {
      return NextResponse.json(
        { error: "Essay text is required" },
        { status: 400 }
      );
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

${essay_text}

Provide your suggestions in the following JSON format:
{
  "suggestions": [
    {
      "category": "grammar" | "structure" | "content" | "style",
      "severity": "high" | "medium" | "low",
      "issue": "Brief description of the issue",
      "suggestion": "Specific suggestion for improvement",
      "example": "Optional example of how to fix it"
    }
  ],
  "overall_feedback": "Brief overall assessment",
  "strengths": ["List of strengths"],
  "areas_for_improvement": ["List of areas to improve"]
}`;

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

    // Try to parse JSON response
    let suggestions;
    try {
      // Find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, structure the response
        suggestions = {
          suggestions: [
            {
              category: "overall",
              severity: "medium",
              issue: "AI Response",
              suggestion: content,
              example: ""
            }
          ],
          overall_feedback: content.substring(0, 200),
          strengths: [],
          areas_for_improvement: []
        };
      }
    } catch (parseError) {
      // If parsing fails, return raw response
      suggestions = {
        suggestions: [
          {
            category: "overall",
            severity: "medium",
            issue: "AI Response",
            suggestion: content,
            example: ""
          }
        ],
        overall_feedback: content.substring(0, 200),
        strengths: [],
        areas_for_improvement: []
      };
    }

    return NextResponse.json({
      success: true,
      data: suggestions,
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
