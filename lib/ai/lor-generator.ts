import { createLLM } from "./llm-factory";

interface LORGenerationParams {
  student: any;
  programType: string;
  relationshipType: string;
  relationshipDuration: string;
  relationshipContext: string;
  specificExamples: string;
}

export async function generateLORWithAI(params: LORGenerationParams): Promise<string> {
  const {
    student,
    programType,
    relationshipType,
    relationshipDuration,
    relationshipContext,
    specificExamples,
  } = params;

  // Create a comprehensive prompt for LOR generation
  const prompt = `You are a college counselor writing a professional Letter of Recommendation for a student applying to college.

**Student Information:**
- Name: ${student.first_name} ${student.last_name}
- Email: ${student.email}
- Graduation Year: ${student.graduation_year}
- GPA (Unweighted): ${student.gpa_unweighted || "Not provided"}
- GPA (Weighted): ${student.gpa_weighted || "Not provided"}
- SAT Score: ${student.sat_score || "Not provided"}
- ACT Score: ${student.act_score || "Not provided"}
- Class Rank: ${student.class_rank ? `${student.class_rank} out of ${student.class_size}` : "Not provided"}

**Your Relationship with the Student:**
- Relationship Type: ${relationshipType}
- Duration: ${relationshipDuration}
- Context: ${relationshipContext}

**Program/College Type:**
${programType}

**Specific Examples and Achievements to Highlight:**
${specificExamples}

---

Please write a compelling, professional Letter of Recommendation that:
1. Opens with a strong introduction stating your relationship and how long you've known the student
2. Highlights the student's academic strengths and intellectual curiosity
3. Discusses their personal qualities, character, and leadership abilities
4. Includes specific examples and anecdotes that demonstrate their qualities
5. Addresses why they would be a great fit for ${programType}
6. Concludes with a strong recommendation

The letter should be approximately 400-600 words, written in a professional yet warm tone, and be genuinely enthusiastic about recommending this student.

**Important:** Write the complete letter ready to be sent. Include proper salutation ("To Whom It May Concern:" or "Dear Admissions Committee:") and closing ("Sincerely,").`;

  try {
    const llm = createLLM();
    const response = await llm.invoke(prompt);

    let content = "";
    if (typeof response.content === "string") {
      content = response.content;
    } else if (Array.isArray(response.content)) {
      content = response.content
        .map((item: any) => (typeof item === "string" ? item : item.text || ""))
        .join("");
    }

    return content.trim();
  } catch (error) {
    console.error("Error generating LOR with AI:", error);
    throw new Error("Failed to generate letter content with AI");
  }
}

// Simplified helper for quick generation from chatbot
export async function quickGenerateLOR(studentId: string, context?: string): Promise<string> {
  // This can be called from the chatbot with minimal info
  // It will use default values and student data from the database

  const defaultParams = {
    student: {
      first_name: "the",
      last_name: "student",
      email: "",
      graduation_year: new Date().getFullYear(),
      gpa_unweighted: null,
      gpa_weighted: null,
      sat_score: null,
      act_score: null,
      class_rank: null,
      class_size: null,
    },
    programType: "college/university",
    relationshipType: "College Counselor",
    relationshipDuration: "this academic year",
    relationshipContext: context || "I have worked with this student as their college counselor.",
    specificExamples: "Please provide specific examples of the student's achievements and qualities.",
  };

  return generateLORWithAI(defaultParams);
}
