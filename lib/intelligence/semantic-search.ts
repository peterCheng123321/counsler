/**
 * AI-Powered Semantic Search System
 * Provides intelligent search across students, essays, activities, and notes
 * using vector embeddings and similarity matching
 */

import { createClient } from "@/lib/supabase/server";
import { aiServiceManager } from "@/lib/ai";

export interface SemanticSearchResult<T = any> {
  item: T;
  score: number; // 0-1, higher = better match
  matchType: "exact" | "semantic" | "hybrid";
  highlights?: string[];
}

export interface SearchOptions {
  limit?: number;
  threshold?: number; // Minimum similarity score (0-1)
  includeMetadata?: boolean;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Search essays by semantic meaning
 */
export async function searchEssays(
  query: string,
  options: SearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 10, threshold = 0.7, includeMetadata = true } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Generate query embedding
  const queryEmbedding = await aiServiceManager.generateEmbedding(query);

  // Get all essays for this counselor's students
  const { data: essays, error } = await supabase
    .from("essays")
    .select(`
      id,
      content,
      prompt,
      word_count,
      created_at,
      students!inner (
        id,
        counselor_id,
        first_name,
        last_name
      )
    `)
    .eq("students.counselor_id", user.id);

  if (error) {
    throw new Error(`Failed to fetch essays: ${error.message}`);
  }

  if (!essays || essays.length === 0) {
    return [];
  }

  // Calculate similarity for each essay
  const results: Array<{ item: any; score: number }> = [];

  for (const essay of essays) {
    if (!essay.content || essay.content.length < 50) {
      continue; // Skip very short or empty essays
    }

    // Generate embedding for essay content
    const essayEmbedding = await aiServiceManager.generateEmbedding(
      essay.content.substring(0, 2000) // Limit to first 2000 chars for performance
    );

    // Calculate similarity
    const similarity = cosineSimilarity(queryEmbedding, essayEmbedding);

    if (similarity >= threshold) {
      results.push({
        item: {
          id: essay.id,
          content: essay.content,
          prompt: essay.prompt,
          wordCount: essay.word_count,
          student: essay.students,
          createdAt: essay.created_at,
        },
        score: similarity,
      });
    }
  }

  // Sort by similarity score
  results.sort((a, b) => b.score - a.score);

  // Return top results
  return results.slice(0, limit).map(r => ({
    item: r.item,
    score: r.score,
    matchType: r.score > 0.9 ? "exact" : "semantic",
    highlights: includeMetadata ? extractHighlights(r.item.content, query) : undefined,
  }));
}

/**
 * Search students by semantic profile matching
 */
export async function searchStudents(
  query: string,
  options: SearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 10, threshold = 0.65 } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Generate query embedding
  const queryEmbedding = await aiServiceManager.generateEmbedding(query);

  // Get all students with their activities
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      email,
      graduation_year,
      gpa_unweighted,
      sat_score,
      act_score,
      application_progress,
      activities (
        name,
        description,
        leadership_positions
      )
    `)
    .eq("counselor_id", user.id);

  if (error) {
    throw new Error(`Failed to fetch students: ${error.message}`);
  }

  if (!students || students.length === 0) {
    return [];
  }

  // Calculate similarity for each student
  const results: Array<{ item: any; score: number }> = [];

  for (const student of students) {
    // Create student profile text
    const profileText = buildStudentProfileText(student);

    // Generate embedding for profile
    const profileEmbedding = await aiServiceManager.generateEmbedding(profileText);

    // Calculate similarity
    const similarity = cosineSimilarity(queryEmbedding, profileEmbedding);

    if (similarity >= threshold) {
      results.push({
        item: student,
        score: similarity,
      });
    }
  }

  // Sort by similarity score
  results.sort((a, b) => b.score - a.score);

  // Return top results
  return results.slice(0, limit).map(r => ({
    item: r.item,
    score: r.score,
    matchType: r.score > 0.85 ? "exact" : "semantic",
  }));
}

/**
 * Search activities by semantic similarity
 */
export async function searchActivities(
  query: string,
  options: SearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 10, threshold = 0.7 } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Generate query embedding
  const queryEmbedding = await aiServiceManager.generateEmbedding(query);

  // Get all activities for this counselor's students
  const { data: activities, error } = await supabase
    .from("activities")
    .select(`
      id,
      name,
      description,
      leadership_positions,
      honors_received,
      hours_per_week,
      weeks_per_year,
      students!inner (
        id,
        counselor_id,
        first_name,
        last_name
      )
    `)
    .eq("students.counselor_id", user.id);

  if (error) {
    throw new Error(`Failed to fetch activities: ${error.message}`);
  }

  if (!activities || activities.length === 0) {
    return [];
  }

  // Calculate similarity for each activity
  const results: Array<{ item: any; score: number }> = [];

  for (const activity of activities) {
    // Build activity text
    const activityText = `${activity.name}. ${activity.description || ""}. ${
      activity.leadership_positions?.join(", ") || ""
    }. ${activity.honors_received?.join(", ") || ""}`;

    if (activityText.length < 20) {
      continue; // Skip activities with minimal info
    }

    // Generate embedding
    const activityEmbedding = await aiServiceManager.generateEmbedding(activityText);

    // Calculate similarity
    const similarity = cosineSimilarity(queryEmbedding, activityEmbedding);

    if (similarity >= threshold) {
      results.push({
        item: activity,
        score: similarity,
      });
    }
  }

  // Sort by similarity score
  results.sort((a, b) => b.score - a.score);

  // Return top results
  return results.slice(0, limit).map(r => ({
    item: r.item,
    score: r.score,
    matchType: "semantic",
  }));
}

/**
 * Hybrid search: combines keyword + semantic search
 */
export async function hybridSearch(
  query: string,
  searchTypes: Array<"students" | "essays" | "activities"> = ["students", "essays", "activities"],
  options: SearchOptions = {}
): Promise<{
  students: SemanticSearchResult[];
  essays: SemanticSearchResult[];
  activities: SemanticSearchResult[];
  summary: string;
}> {
  const results: any = {
    students: [],
    essays: [],
    activities: [],
  };

  // Run searches in parallel
  const searches: Promise<any>[] = [];

  if (searchTypes.includes("students")) {
    searches.push(
      searchStudents(query, options).then(res => {
        results.students = res;
      })
    );
  }

  if (searchTypes.includes("essays")) {
    searches.push(
      searchEssays(query, options).then(res => {
        results.essays = res;
      })
    );
  }

  if (searchTypes.includes("activities")) {
    searches.push(
      searchActivities(query, options).then(res => {
        results.activities = res;
      })
    );
  }

  await Promise.all(searches);

  // Generate summary
  const totalResults =
    results.students.length + results.essays.length + results.activities.length;

  const summary = `Found ${totalResults} results: ${results.students.length} students, ${results.essays.length} essays, ${results.activities.length} activities`;

  return {
    ...results,
    summary,
  };
}

/**
 * Find similar essays to a given essay
 */
export async function findSimilarEssays(
  essayId: string,
  options: SearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 5, threshold = 0.75 } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get the source essay
  const { data: sourceEssay, error: sourceError } = await supabase
    .from("essays")
    .select(`
      content,
      students!inner (counselor_id)
    `)
    .eq("id", essayId)
    .single();

  if (sourceError || !sourceEssay) {
    throw new Error("Essay not found");
  }

  // Check ownership
  const student = Array.isArray(sourceEssay.students)
    ? sourceEssay.students[0]
    : sourceEssay.students;
  if (student.counselor_id !== user.id) {
    throw new Error("Unauthorized");
  }

  if (!sourceEssay.content || sourceEssay.content.length < 50) {
    return [];
  }

  // Use the essay content as the search query
  return searchEssays(sourceEssay.content.substring(0, 1000), {
    limit: limit + 1, // +1 to account for the source essay itself
    threshold,
    includeMetadata: false,
  }).then(results => {
    // Filter out the source essay
    return results.filter(r => r.item.id !== essayId).slice(0, limit);
  });
}

/**
 * Find similar students based on profile
 */
export async function findSimilarStudents(
  studentId: string,
  options: SearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 5, threshold = 0.7 } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get the source student
  const { data: sourceStudent, error } = await supabase
    .from("students")
    .select(`
      *,
      activities (
        name,
        description,
        leadership_positions
      )
    `)
    .eq("id", studentId)
    .eq("counselor_id", user.id)
    .single();

  if (error || !sourceStudent) {
    throw new Error("Student not found");
  }

  // Build profile text
  const profileText = buildStudentProfileText(sourceStudent);

  // Search for similar students
  return searchStudents(profileText, { limit: limit + 1, threshold }).then(results => {
    // Filter out the source student
    return results.filter(r => r.item.id !== studentId).slice(0, limit);
  });
}

/**
 * Extract relevant highlights from text
 */
function extractHighlights(text: string, query: string, maxHighlights: number = 3): string[] {
  const highlights: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const queryWords = query.toLowerCase().split(/\s+/);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const matchCount = queryWords.filter(word => lowerSentence.includes(word)).length;

    if (matchCount > 0) {
      highlights.push(sentence.trim());
      if (highlights.length >= maxHighlights) {
        break;
      }
    }
  }

  return highlights;
}

/**
 * Build searchable text from student profile
 */
function buildStudentProfileText(student: any): string {
  const parts: string[] = [];

  // Basic info
  parts.push(`${student.first_name} ${student.last_name}`);
  parts.push(`Class of ${student.graduation_year}`);

  // Academic info
  if (student.gpa_unweighted) {
    parts.push(`GPA ${student.gpa_unweighted}`);
  }
  if (student.sat_score) {
    parts.push(`SAT ${student.sat_score}`);
  }
  if (student.act_score) {
    parts.push(`ACT ${student.act_score}`);
  }

  // Activities
  if (student.activities && student.activities.length > 0) {
    const activityDescriptions = student.activities.map((a: any) => {
      const leadership = a.leadership_positions?.join(", ") || "";
      return `${a.name}. ${a.description || ""}. ${leadership}`;
    });
    parts.push(activityDescriptions.join(" "));
  }

  return parts.join(". ");
}

/**
 * Smart search with AI-powered query understanding
 */
export async function smartSearch(
  naturalLanguageQuery: string,
  options: SearchOptions = {}
): Promise<{
  interpretation: string;
  results: {
    students: SemanticSearchResult[];
    essays: SemanticSearchResult[];
    activities: SemanticSearchResult[];
  };
  suggestions: string[];
}> {
  // Use AI to interpret the query
  const interpretation = await aiServiceManager.chat(
    [
      {
        role: "user",
        content: `Interpret this search query and extract key search terms: "${naturalLanguageQuery}"

Respond with JSON:
{
  "interpretation": "brief explanation of what user is looking for",
  "searchTerms": "optimized search query",
  "searchTypes": ["students" | "essays" | "activities"],
  "suggestions": ["related search suggestion 1", "suggestion 2"]
}`,
      },
    ],
    {
      temperature: 0.3,
      maxTokens: 300,
    }
  );

  // Parse AI response
  let parsedInterpretation: any;
  try {
    const jsonMatch = interpretation.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedInterpretation = JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    // Fallback if parsing fails
    parsedInterpretation = {
      interpretation: "Searching for: " + naturalLanguageQuery,
      searchTerms: naturalLanguageQuery,
      searchTypes: ["students", "essays", "activities"],
      suggestions: [],
    };
  }

  // Execute search
  const results = await hybridSearch(
    parsedInterpretation.searchTerms || naturalLanguageQuery,
    parsedInterpretation.searchTypes || ["students", "essays", "activities"],
    options
  );

  return {
    interpretation: parsedInterpretation.interpretation || "Searching...",
    results,
    suggestions: parsedInterpretation.suggestions || [],
  };
}
