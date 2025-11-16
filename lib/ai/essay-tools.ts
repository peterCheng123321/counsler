/**
 * Essay Management Tools
 * Complete CRUD operations + AI suggestions for essays
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLLM } from "./llm-factory";

// ============================================================================
// ESSAY QUERY TOOLS
// ============================================================================

/**
 * Get all essays or filter by student/status
 */
export const getEssaysTool = new DynamicStructuredTool({
  name: "get_essays",
  description: `Query essays with optional filters.
  Use this to list essays, optionally filtered by student ID or status.
  Returns essay metadata including title, status, word count, and student info.

  Examples:
  - "List all essays"
  - "Show all draft essays"
  - "Get Sophia Chen's essays" (requires student_id from get_students first)`,

  schema: z.object({
    student_id: z.string().uuid().optional().describe("Filter by student ID"),
    status: z.enum(["draft", "in_review", "completed"]).optional().describe("Filter by status"),
    limit: z.number().optional().default(50).describe("Maximum number of results"),
  }),

  func: async ({ student_id, status, limit = 50 }) => {
    try {
      const supabase = createAdminClient();

      // Fetch essays without join (foreign key not configured in database)
      let query = supabase
        .from("essays")
        .select("id, title, prompt, status, word_count, created_at, updated_at, student_id")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (student_id) {
        query = query.eq("student_id", student_id);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data: essays, error } = await query;

      if (error) {
        return JSON.stringify({
          success: false,
          error: "Failed to fetch essays",
          message: error.message,
        });
      }

      // Fetch student data separately
      const studentIds = [...new Set((essays || []).map((e: any) => e.student_id).filter(Boolean))];
      const studentsMap = new Map();

      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from("students")
          .select("id, first_name, last_name, email")
          .in("id", studentIds);

        (students || []).forEach((s: any) => {
          studentsMap.set(s.id, s);
        });
      }

      // Merge essay and student data
      const result = (essays || []).map((e: any) => {
        const student = studentsMap.get(e.student_id);
        return {
          essay_id: e.id,
          title: e.title,
          prompt: e.prompt,
          status: e.status,
          word_count: e.word_count || 0,
          student_id: e.student_id,
          student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
          student_email: student?.email,
          created_at: e.created_at,
          updated_at: e.updated_at,
        };
      });

      return JSON.stringify({
        success: true,
        essays: result,
        count: result.length,
        filters: { student_id, status },
        message: result.length > 0
          ? `Found ${result.length} essay${result.length > 1 ? 's' : ''}`
          : "No essays found matching criteria",
      });
    } catch (error) {
      console.error("[Essay Tool] Error fetching essays:", error);
      return JSON.stringify({
        success: false,
        error: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Get single essay by ID
 */
export const getEssayTool = new DynamicStructuredTool({
  name: "get_essay",
  description: `Get detailed information about a specific essay by ID.
  Returns full essay details including content, metadata, and student info.

  Use this before updating or opening an essay to verify it exists.`,

  schema: z.object({
    essay_id: z.string().uuid().describe("The UUID of the essay to retrieve"),
  }),

  func: async ({ essay_id }) => {
    try {
      const supabase = createAdminClient();

      // Fetch essay without join
      const { data: essay, error } = await supabase
        .from("essays")
        .select("*")
        .eq("id", essay_id)
        .single();

      if (error || !essay) {
        return JSON.stringify({
          success: false,
          error: "Essay not found",
          message: `No essay found with ID ${essay_id}`,
          suggestion: "Use search_essays or get_essays to find available essays",
        });
      }

      // Fetch student data separately if student_id exists
      let student = null;
      if (essay.student_id) {
        const { data: studentData } = await supabase
          .from("students")
          .select("id, first_name, last_name, email, graduation_year")
          .eq("id", essay.student_id)
          .single();
        student = studentData;
      }

      return JSON.stringify({
        success: true,
        essay: {
          id: essay.id,
          title: essay.title,
          content: essay.content,
          prompt: essay.prompt,
          status: essay.status,
          word_count: essay.word_count || (essay.content ? essay.content.trim().split(/\s+/).filter(Boolean).length : 0),
          student_id: essay.student_id,
          student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
          student_email: student?.email,
          created_at: essay.created_at,
          updated_at: essay.updated_at,
        },
        message: `Retrieved essay: ${essay.title}`,
      });
    } catch (error) {
      console.error("[Essay Tool] Error fetching essay:", error);
      return JSON.stringify({
        success: false,
        error: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// ============================================================================
// ESSAY CRUD TOOLS
// ============================================================================

/**
 * Create new essay for student
 */
export const createEssayTool = new DynamicStructuredTool({
  name: "create_essay",
  description: `Propose creating a new essay for a student. Requires user confirmation.
  Use this when the user wants to create a new essay.

  Examples:
  - "Create a Common App essay for Sophia Chen"
  - "Add a personal statement for Emily Rodriguez"
  - "Start a new supplemental essay"`,

  schema: z.object({
    student_id: z.string().uuid().describe("The student ID (UUID) - get from get_students first"),
    title: z.string().describe("Essay title (e.g., 'Common App Personal Statement')"),
    prompt: z.string().optional().describe("Essay prompt or question"),
    essay_type: z.enum(["common_app", "supplemental", "personal_statement", "other"]).optional().describe("Type of essay"),
    content: z.string().optional().describe("Initial essay content (can be empty)"),
  }),

  func: async ({ student_id, title, prompt, essay_type, content }) => {
    return JSON.stringify({
      action: "create_essay",
      status: "pending_confirmation",
      entity: "essay",
      data: {
        student_id,
        title,
        prompt,
        essay_type,
        content: content || "",
        status: "draft",
      },
      message: `I will create a new essay:\n- Title: ${title}\n- Student ID: ${student_id}${prompt ? `\n- Prompt: ${prompt}` : ""}${essay_type ? `\n- Type: ${essay_type}` : ""}\n\n**Please confirm this action.**`,
    });
  },
});

/**
 * Delete essay
 */
export const deleteEssayTool = new DynamicStructuredTool({
  name: "delete_essay",
  description: `Propose deleting an essay. Requires user confirmation.
  Use this when the user wants to remove an essay permanently.

  Examples:
  - "Delete the draft essay"
  - "Remove Sophia's old personal statement"`,

  schema: z.object({
    essay_id: z.string().uuid().describe("The UUID of the essay to delete"),
  }),

  func: async ({ essay_id }) => {
    try {
      const supabase = createAdminClient();

      // Fetch essay details for confirmation message
      const { data: essay, error } = await supabase
        .from("essays")
        .select(`
          title,
          student:students!student_id (first_name, last_name)
        `)
        .eq("id", essay_id)
        .single();

      if (error || !essay) {
        return JSON.stringify({
          success: false,
          error: "Essay not found",
          message: `No essay found with ID ${essay_id}`,
        });
      }

      const studentName = essay.student ? `${essay.student.first_name} ${essay.student.last_name}` : "Unknown";

      return JSON.stringify({
        action: "delete_essay",
        status: "pending_confirmation",
        entity: "essay",
        id: essay_id,
        data: { essay_id },
        message: `⚠️ **WARNING:** This will permanently delete the essay:\n- Title: ${essay.title}\n- Student: ${studentName}\n\nThis action cannot be undone.\n\n**Please confirm deletion.**`,
      });
    } catch (error) {
      console.error("[Essay Tool] Error preparing delete:", error);
      return JSON.stringify({
        success: false,
        error: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// ============================================================================
// AI WRITING ASSISTANCE
// ============================================================================

/**
 * Get AI suggestions for improving essay
 */
export const aiEssaySuggestionsTool = new DynamicStructuredTool({
  name: "ai_essay_suggestions",
  description: `Get AI-powered writing suggestions for an essay.
  Provides grammar fixes, style improvements, content suggestions, and structural recommendations.

  Use this when user wants to improve their essay writing.

  Examples:
  - "Give me suggestions for improving this essay"
  - "Check grammar in Sophia's personal statement"
  - "How can I improve the structure of this essay?"`,

  schema: z.object({
    essay_id: z.string().uuid().describe("The UUID of the essay to analyze"),
    suggestion_type: z.enum(["grammar", "style", "content", "structure", "all"])
      .optional()
      .default("all")
      .describe("Type of suggestions: grammar, style, content, structure, or all"),
  }),

  func: async ({ essay_id, suggestion_type = "all" }) => {
    try {
      const supabase = createAdminClient();

      // Fetch essay
      const { data: essay, error } = await supabase
        .from("essays")
        .select(`
          *,
          student:students!student_id (first_name, last_name, graduation_year)
        `)
        .eq("id", essay_id)
        .single();

      if (error || !essay) {
        return JSON.stringify({
          success: false,
          error: "Essay not found",
          message: `No essay found with ID ${essay_id}`,
        });
      }

      if (!essay.content || essay.content.trim().length === 0) {
        return JSON.stringify({
          success: false,
          error: "Empty essay",
          message: "This essay has no content to analyze. Please add content first.",
        });
      }

      // Build AI prompt based on suggestion type
      let prompt = `You are an expert college essay advisor. Analyze the following essay and provide specific, actionable suggestions.\n\n`;

      prompt += `**Essay Title:** ${essay.title}\n`;
      prompt += `**Essay Prompt:** ${essay.prompt || "Not specified"}\n`;
      prompt += `**Student:** ${essay.student ? `${essay.student.first_name} ${essay.student.last_name} (Class of ${essay.student.graduation_year})` : "Unknown"}\n`;
      prompt += `**Word Count:** ${essay.word_count || 0}\n\n`;
      prompt += `**Essay Content:**\n${essay.content}\n\n`;

      prompt += `**Instructions:**\n`;

      if (suggestion_type === "grammar" || suggestion_type === "all") {
        prompt += `1. **Grammar & Mechanics:** Identify grammar errors, punctuation issues, and spelling mistakes. Provide specific corrections.\n`;
      }

      if (suggestion_type === "style" || suggestion_type === "all") {
        prompt += `2. **Style & Tone:** Suggest improvements to sentence structure, word choice, and overall tone. Make the writing more engaging and authentic.\n`;
      }

      if (suggestion_type === "content" || suggestion_type === "all") {
        prompt += `3. **Content & Substance:** Evaluate the essay's message, storytelling, and personal insights. Suggest ways to add depth and specificity.\n`;
      }

      if (suggestion_type === "structure" || suggestion_type === "all") {
        prompt += `4. **Structure & Organization:** Assess the essay's flow, paragraph transitions, and overall structure. Recommend organizational improvements.\n`;
      }

      prompt += `\nProvide your response in JSON format with this structure:
{
  "overall_assessment": "Brief overall evaluation (2-3 sentences)",
  "strengths": ["strength 1", "strength 2", ...],
  "suggestions": [
    {
      "category": "grammar|style|content|structure",
      "priority": "high|medium|low",
      "issue": "Description of the issue",
      "suggestion": "Specific recommendation",
      "example": "Optional: Show before/after example"
    }
  ],
  "word_count_feedback": "Feedback on essay length (Common App limit: 650 words)",
  "next_steps": ["actionable next step 1", "actionable next step 2"]
}`;

      // Call LLM
      console.log("[Essay AI] Generating suggestions for essay:", essay_id);
      const llm = createLLM({
        temperature: 0.3, // Lower temperature for more focused feedback
        maxTokens: 2000,
      });

      const response = await llm.invoke(prompt);
      const responseText = response.content.toString();

      // Parse JSON response
      let suggestions: any;
      try {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        suggestions = JSON.parse(jsonText);
      } catch (parseError) {
        console.warn("[Essay AI] Failed to parse JSON, returning raw text");
        suggestions = {
          overall_assessment: responseText.substring(0, 500),
          suggestions: [],
          note: "AI response could not be parsed as structured data. See overall_assessment for full feedback.",
        };
      }

      return JSON.stringify({
        success: true,
        essay_id: essay.id,
        essay_title: essay.title,
        word_count: essay.word_count || 0,
        suggestion_type,
        suggestions,
        message: `Generated ${suggestion_type} suggestions for "${essay.title}"`,
      });
    } catch (error) {
      console.error("[Essay AI] Error generating suggestions:", error);
      return JSON.stringify({
        success: false,
        error: "Failed to generate suggestions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Export all essay tools
export const essayTools = [
  getEssaysTool,
  getEssayTool,
  createEssayTool,
  deleteEssayTool,
  aiEssaySuggestionsTool,
];
