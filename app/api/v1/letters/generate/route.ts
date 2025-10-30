import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";
import { ChatOpenAI, AzureChatOpenAI } from "@langchain/openai";

const generateLorSchema = z.object({
  studentId: z.string().uuid(),
  collegeName: z.string().min(1),
  strengths: z.array(z.string()).optional(),
  tone: z.enum(["formal", "personal", "academic"]).default("formal"),
  programType: z.string().optional(),
  relationshipType: z.string().optional(),
  relationshipDuration: z.string().optional(),
  relationshipContext: z.string().optional(),
  specificExamples: z.string().optional(),
});

/**
 * Create LLM instance for letter generation
 */
function createLLM() {
  // Try Azure OpenAI first
  if (
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  ) {
    return new AzureChatOpenAI({
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT.replace(
        "https://",
        ""
      ).replace(".openai.azure.com/", "").replace(".openai.azure.com", ""),
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview",
      temperature: 0.7,
      maxTokens: 2000,
    });
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    return new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 2000,
    });
  }

  throw new Error(
    "No AI service configured for letter generation"
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const validatedData = generateLorSchema.parse(body);

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", validatedData.studentId)
      .eq("counselor_id", DEMO_USER_ID)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Find or create college
    let studentCollegeId: string | null = null;
    if (validatedData.collegeName) {
      // Find college by name
      let { data: college } = await supabase
        .from("colleges")
        .select("id")
        .eq("name", validatedData.collegeName)
        .maybeSingle();

      // Create college if it doesn't exist
      if (!college) {
        const { data: newCollege } = await supabase
          .from("colleges")
          .insert({ name: validatedData.collegeName })
          .select("id")
          .single();
        college = newCollege;
      }

      if (college) {
        // Find or create student-college relationship
        const { data: studentCollege } = await supabase
          .from("student_colleges")
          .select("id")
          .eq("student_id", validatedData.studentId)
          .eq("college_id", college.id)
          .maybeSingle();

        studentCollegeId = studentCollege?.id || null;
      }
    }

    // Build prompt for AI
    const prompt = `You are a college counselor writing a Letter of Recommendation for a student.

Student Information:
- Name: ${student.first_name} ${student.last_name}
- Email: ${student.email}
- Graduation Year: ${student.graduation_year}
${student.gpa_unweighted ? `- GPA: ${student.gpa_unweighted}` : ""}
${validatedData.programType ? `- Program Type: ${validatedData.programType}` : ""}

College: ${validatedData.collegeName}

${validatedData.relationshipType ? `Relationship Type: ${validatedData.relationshipType}` : ""}
${validatedData.relationshipDuration ? `Relationship Duration: ${validatedData.relationshipDuration}` : ""}
${validatedData.relationshipContext ? `Relationship Context: ${validatedData.relationshipContext}` : ""}

${validatedData.strengths && validatedData.strengths.length > 0 ? `Key Strengths to Highlight:\n${validatedData.strengths.map((s: string) => `- ${s}`).join("\n")}` : ""}

${validatedData.specificExamples ? `Specific Examples:\n${validatedData.specificExamples}` : ""}

Tone: ${validatedData.tone}

Please write a compelling Letter of Recommendation following these guidelines:
1. Use proper business letter format
2. Include a strong opening that captures attention
3. Highlight the student's academic abilities, character, and achievements
4. Provide specific examples that demonstrate their qualities
5. Address their potential for success in college
6. End with a strong recommendation
7. Keep it between 300-500 words
8. Use a ${validatedData.tone} tone throughout

Write the complete letter now:`;

    // Generate letter using AI
    console.log("[LOR Generation] Calling AI to generate letter...");
    const llm = createLLM();
    const response = await llm.invoke(prompt);
    const generatedContent = response.content.toString();
    console.log("[LOR Generation] Letter generated successfully");

    // Save to database
    const { data: lor, error: lorError } = await supabase
      .from("letters_of_recommendation")
      .insert({
        student_id: validatedData.studentId,
        counselor_id: DEMO_USER_ID,
        student_college_id: studentCollegeId,
        program_type: validatedData.programType,
        relationship_type: validatedData.relationshipType,
        relationship_duration: validatedData.relationshipDuration,
        relationship_context: validatedData.relationshipContext,
        specific_examples: validatedData.specificExamples,
        generated_content: generatedContent,
        status: "draft",
      })
      .select()
      .single();

    if (lorError) {
      console.error("Error saving LOR:", lorError);
      return NextResponse.json(
        { error: "Failed to save letter", details: lorError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: lor,
      success: true,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Unexpected error in POST generate letter:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
