/**
 * Intelligent College Recommendation Algorithm
 * Matches students with colleges based on academic fit, preferences, and admission probability
 */

import { createClient } from "@/lib/supabase/server";
import { aiServiceManager } from "@/lib/ai";

export interface CollegeMatch {
  collegeId: string;
  collegeName: string;
  matchScore: number; // 0-100, overall fit
  admissionProbability: number; // 0-100, likelihood of acceptance
  fitAnalysis: {
    academicFit: number; // 0-100
    financialFit: number; // 0-100 (placeholder for future)
    culturalFit: number; // 0-100
  };
  category: "Safety" | "Target" | "Reach";
  reasoning: string;
  strengths: string[];
  concerns: string[];
}

export interface StudentProfile {
  id: string;
  gpaUnweighted?: number;
  gpaWeighted?: number;
  satScore?: number;
  actScore?: number;
  classRank?: number;
  classSize?: number;
  activities: Array<{
    name: string;
    leadership: boolean;
    hoursPerWeek: number;
  }>;
  essays: Array<{
    quality?: number;
  }>;
  intendedMajor?: string;
  preferences?: {
    location?: string[];
    size?: string;
    setting?: string;
  };
}

export interface CollegeProfile {
  id: string;
  name: string;
  acceptanceRate?: number;
  averageGPA?: number;
  satRange?: { min: number; max: number };
  actRange?: { min: number; max: number };
  location?: {
    city: string;
    state: string;
  };
  type?: string;
  size?: number;
}

/**
 * Find best college matches for a student
 */
export async function findCollegeMatches(
  studentId: string,
  limit: number = 20
): Promise<CollegeMatch[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get student profile
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      *,
      activities (*),
      essays (*)
    `)
    .eq("id", studentId)
    .eq("counselor_id", user.id)
    .single();

  if (studentError || !student) {
    throw new Error("Student not found");
  }

  // Get all colleges (in production, you'd filter by student preferences)
  const { data: colleges, error: collegesError } = await supabase
    .from("colleges")
    .select("*")
    .limit(100);

  if (collegesError) {
    throw new Error("Failed to fetch colleges");
  }

  if (!colleges || colleges.length === 0) {
    return [];
  }

  // Build student profile
  const studentProfile: StudentProfile = {
    id: student.id,
    gpaUnweighted: student.gpa_unweighted,
    gpaWeighted: student.gpa_weighted,
    satScore: student.sat_score,
    actScore: student.act_score,
    classRank: student.class_rank,
    classSize: student.class_size,
    activities: student.activities || [],
    essays: student.essays || [],
  };

  // Calculate matches
  const matches: CollegeMatch[] = [];

  for (const college of colleges) {
    const collegeProfile: CollegeProfile = {
      id: college.id,
      name: college.name,
      acceptanceRate: college.acceptance_rate,
      location: {
        city: college.location_city || "",
        state: college.location_state || "",
      },
      type: college.type,
    };

    const match = await calculateCollegeMatch(studentProfile, collegeProfile);
    matches.push(match);
  }

  // Sort by match score and return top results
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Calculate match between student and college
 */
async function calculateCollegeMatch(
  student: StudentProfile,
  college: CollegeProfile
): Promise<CollegeMatch> {
  // Calculate academic fit
  const academicFit = calculateAcademicFit(student, college);

  // Calculate admission probability
  const admissionProbability = calculateAdmissionProbability(student, college);

  // Determine category based on admission probability
  let category: "Safety" | "Target" | "Reach";
  if (admissionProbability >= 70) category = "Safety";
  else if (admissionProbability >= 40) category = "Target";
  else category = "Reach";

  // Calculate cultural fit (placeholder - would use more data)
  const culturalFit = 75; // Default

  // Financial fit (placeholder for future feature)
  const financialFit = 75; // Default

  // Overall match score (weighted average)
  const matchScore = Math.round(
    academicFit * 0.5 +
    admissionProbability * 0.3 +
    culturalFit * 0.1 +
    financialFit * 0.1
  );

  // Generate reasoning
  const reasoning = await generateMatchReasoning(
    student,
    college,
    academicFit,
    admissionProbability,
    category
  );

  // Identify strengths and concerns
  const { strengths, concerns } = analyzeMatchFactors(
    student,
    college,
    academicFit,
    admissionProbability
  );

  return {
    collegeId: college.id,
    collegeName: college.name,
    matchScore,
    admissionProbability,
    fitAnalysis: {
      academicFit,
      financialFit,
      culturalFit,
    },
    category,
    reasoning,
    strengths,
    concerns,
  };
}

/**
 * Calculate academic fit score
 */
function calculateAcademicFit(
  student: StudentProfile,
  college: CollegeProfile
): number {
  let fitScore = 50; // Base score

  // GPA comparison
  if (student.gpaUnweighted && college.averageGPA) {
    const gpaDiff = student.gpaUnweighted - college.averageGPA;
    if (gpaDiff >= 0) {
      fitScore += Math.min(gpaDiff * 15, 25); // Bonus for higher GPA
    } else {
      fitScore += Math.max(gpaDiff * 20, -30); // Penalty for lower GPA
    }
  }

  // SAT score comparison
  if (student.satScore && college.satRange) {
    const { min, max } = college.satRange;
    const midpoint = (min + max) / 2;

    if (student.satScore >= max) {
      fitScore += 15; // Above range
    } else if (student.satScore >= midpoint) {
      fitScore += 10; // In upper half
    } else if (student.satScore >= min) {
      fitScore += 5; // In lower half
    } else {
      fitScore -= 15; // Below range
    }
  }

  // Class rank bonus
  if (student.classRank && student.classSize) {
    const percentile = (student.classRank / student.classSize) * 100;
    if (percentile <= 10) fitScore += 10; // Top 10%
    else if (percentile <= 25) fitScore += 5; // Top 25%
  }

  return Math.max(0, Math.min(100, fitScore));
}

/**
 * Calculate admission probability using statistical model
 */
function calculateAdmissionProbability(
  student: StudentProfile,
  college: CollegeProfile
): number {
  const acceptanceRate = college.acceptanceRate || 50;

  // Start with base acceptance rate
  let probability = acceptanceRate;

  // Adjust based on academic strength
  const academicFit = calculateAcademicFit(student, college);

  // Strong academic fit increases probability
  if (academicFit >= 80) {
    probability *= 1.4; // 40% boost
  } else if (academicFit >= 60) {
    probability *= 1.2; // 20% boost
  } else if (academicFit < 40) {
    probability *= 0.6; // 40% penalty
  }

  // Extracurricular boost
  const activityCount = student.activities.length;
  const leadershipCount = student.activities.filter(a => a.leadership).length;

  if (leadershipCount >= 2) probability *= 1.15;
  else if (activityCount >= 5) probability *= 1.1;

  // Essay quality boost (if available)
  const avgEssayQuality = student.essays.length > 0
    ? student.essays.reduce((sum, e) => sum + (e.quality || 0), 0) / student.essays.length
    : 0;

  if (avgEssayQuality >= 80) probability *= 1.1;

  // Normalize to 0-100 range
  return Math.max(1, Math.min(99, Math.round(probability)));
}

/**
 * Generate AI-powered reasoning for the match
 */
async function generateMatchReasoning(
  student: StudentProfile,
  college: CollegeProfile,
  academicFit: number,
  admissionProbability: number,
  category: string
): Promise<string> {
  const prompt = `Generate a 2-sentence explanation for why this college is a ${category} for this student.

Student Profile:
- GPA: ${student.gpaUnweighted || "N/A"}
- SAT: ${student.satScore || "N/A"}
- Activities: ${student.activities.length}
- Leadership roles: ${student.activities.filter(a => a.leadership).length}

College:
- Name: ${college.name}
- Acceptance Rate: ${college.acceptanceRate}%
- Type: ${college.type}

Academic Fit: ${academicFit}/100
Admission Probability: ${admissionProbability}%
Category: ${category}

Provide a concise, actionable explanation focusing on the student's strengths and areas for improvement.`;

  try {
    const response = await aiServiceManager.chat(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.5,
        maxTokens: 150,
      }
    );
    return response.content.trim();
  } catch (error) {
    // Fallback reasoning
    if (category === "Safety") {
      return `${college.name} is a safety school with strong alignment to your academic profile (${academicFit}/100 fit). Your credentials exceed typical admitted students.`;
    } else if (category === "Reach") {
      return `${college.name} is a reach school with ${admissionProbability}% estimated admission probability. Consider strengthening extracurriculars and essays to improve chances.`;
    } else {
      return `${college.name} is a target school well-matched to your profile. Focus on demonstrating fit through essays and demonstrated interest.`;
    }
  }
}

/**
 * Analyze match factors to identify strengths and concerns
 */
function analyzeMatchFactors(
  student: StudentProfile,
  college: CollegeProfile,
  academicFit: number,
  admissionProbability: number
): { strengths: string[]; concerns: string[] } {
  const strengths: string[] = [];
  const concerns: string[] = [];

  // Academic strengths/concerns
  if (academicFit >= 75) {
    strengths.push("Strong academic alignment with college profile");
  } else if (academicFit < 50) {
    concerns.push("GPA or test scores below typical admitted students");
  }

  // Test scores
  if (student.satScore && student.satScore >= 1450) {
    strengths.push("Competitive standardized test scores");
  } else if (student.satScore && student.satScore < 1200) {
    concerns.push("Test scores may be below competitive range");
  }

  // Extracurriculars
  const leadershipCount = student.activities.filter(a => a.leadership).length;
  if (leadershipCount >= 3) {
    strengths.push("Strong leadership profile");
  } else if (student.activities.length < 3) {
    concerns.push("Limited extracurricular involvement");
  }

  // Acceptance rate considerations
  if (college.acceptanceRate && college.acceptanceRate < 15) {
    concerns.push("Highly selective institution with low acceptance rate");
  }

  // Class rank
  if (student.classRank && student.classSize) {
    const percentile = (student.classRank / student.classSize) * 100;
    if (percentile <= 10) {
      strengths.push("Top 10% class ranking");
    }
  }

  return { strengths, concerns };
}

/**
 * Generate a balanced college list (safeties, targets, reaches)
 */
export async function generateBalancedCollegeList(
  studentId: string
): Promise<{
  safeties: CollegeMatch[];
  targets: CollegeMatch[];
  reaches: CollegeMatch[];
  recommendation: string;
}> {
  const allMatches = await findCollegeMatches(studentId, 30);

  const safeties = allMatches.filter(m => m.category === "Safety").slice(0, 4);
  const targets = allMatches.filter(m => m.category === "Target").slice(0, 5);
  const reaches = allMatches.filter(m => m.category === "Reach").slice(0, 3);

  const recommendation = `Recommended college list: ${safeties.length} safeties, ${targets.length} targets, ${reaches.length} reaches. This balanced approach maximizes acceptance likelihood while maintaining reach aspirations.`;

  return {
    safeties,
    targets,
    reaches,
    recommendation,
  };
}
