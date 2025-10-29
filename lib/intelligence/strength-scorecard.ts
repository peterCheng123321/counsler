/**
 * Application Strength Scorecard
 * Comprehensive evaluation of student's college application competitiveness
 */

import { createClient } from "@/lib/supabase/server";
import { aiServiceManager } from "@/lib/ai";
import { scoreStudentActivities } from "./activity-scorer";
import { analyzeEssay } from "./essay-analyzer";

export interface ApplicationStrengthScorecard {
  overallScore: number; // 0-100
  overallRating: "Exceptional" | "Competitive" | "Solid" | "Developing" | "Needs Improvement";
  categories: {
    academic: {
      score: number; // 0-100
      rating: "Excellent" | "Strong" | "Good" | "Fair" | "Weak";
      factors: {
        gpa: { value: number | null; score: number };
        testScores: { sat?: number; act?: number; score: number };
        rigor: { score: number }; // Placeholder for course rigor
        classRank: { percentile: number | null; score: number };
      };
      strengths: string[];
      concerns: string[];
    };
    extracurricular: {
      score: number; // 0-100
      rating: "Exceptional" | "Strong" | "Good" | "Developing";
      tier1Count: number;
      tier2Count: number;
      topActivities: string[];
      strengths: string[];
      concerns: string[];
    };
    essays: {
      score: number; // 0-100
      rating: "Excellent" | "Strong" | "Good" | "Fair" | "Weak";
      averageQuality: number;
      essaysAnalyzed: number;
      strengths: string[];
      concerns: string[];
    };
    recommendations: {
      score: number; // 0-100
      rating: "Excellent" | "Strong" | "Good" | "Fair";
      recommenderCount: number;
      strengths: string[];
      concerns: string[];
    };
  };
  competitiveness: {
    safetySchools: string; // "Highly Competitive" | "Competitive" | "Good Position"
    targetSchools: string; // "Competitive" | "Moderate" | "Challenging"
    reachSchools: string; // "Possible" | "Difficult" | "Very Difficult"
  };
  recommendations: string[];
  summary: string;
}

/**
 * Generate comprehensive application strength scorecard
 */
export async function generateStrengthScorecard(
  studentId: string
): Promise<ApplicationStrengthScorecard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get student data
  const { data: student, error } = await supabase
    .from("students")
    .select(`
      *,
      activities (*),
      essays (*),
      letters_of_recommendation (*),
      student_colleges (
        colleges (name, acceptance_rate)
      )
    `)
    .eq("id", studentId)
    .eq("counselor_id", user.id)
    .single();

  if (error || !student) {
    throw new Error("Student not found");
  }

  // Evaluate each category
  const academic = evaluateAcademics(student);
  const extracurricular = await evaluateExtracurriculars(student);
  const essays = await evaluateEssays(student);
  const recommendations = evaluateRecommendations(student);

  // Calculate overall score (weighted)
  const overallScore = Math.round(
    academic.score * 0.35 +
    extracurricular.score * 0.30 +
    essays.score * 0.20 +
    recommendations.score * 0.15
  );

  // Determine overall rating
  let overallRating: "Exceptional" | "Competitive" | "Solid" | "Developing" | "Needs Improvement";
  if (overallScore >= 85) overallRating = "Exceptional";
  else if (overallScore >= 70) overallRating = "Competitive";
  else if (overallScore >= 55) overallRating = "Solid";
  else if (overallScore >= 40) overallRating = "Developing";
  else overallRating = "Needs Improvement";

  // Assess competitiveness
  const competitiveness = assessCompetitiveness(overallScore, academic.score, extracurricular.score);

  // Generate recommendations
  const recommendationsList = generateRecommendations(
    academic,
    extracurricular,
    essays,
    recommendations,
    overallScore
  );

  // Generate summary
  const summary = await generateSummary(
    student,
    overallScore,
    overallRating,
    academic,
    extracurricular
  );

  return {
    overallScore,
    overallRating,
    categories: {
      academic,
      extracurricular,
      essays,
      recommendations,
    },
    competitiveness,
    recommendations: recommendationsList,
    summary,
  };
}

/**
 * Evaluate academic strength
 */
function evaluateAcademics(student: any): {
  score: number;
  rating: "Excellent" | "Strong" | "Good" | "Fair" | "Weak";
  factors: any;
  strengths: string[];
  concerns: string[];
} {
  const strengths: string[] = [];
  const concerns: string[] = [];

  // GPA evaluation
  const gpa = student.gpa_unweighted;
  let gpaScore = 0;

  if (gpa !== null) {
    if (gpa >= 3.8) {
      gpaScore = 95;
      strengths.push(`Excellent GPA (${gpa.toFixed(2)})`);
    } else if (gpa >= 3.5) {
      gpaScore = 80;
      strengths.push(`Strong GPA (${gpa.toFixed(2)})`);
    } else if (gpa >= 3.0) {
      gpaScore = 60;
    } else {
      gpaScore = 40;
      concerns.push(`GPA below 3.0 (${gpa.toFixed(2)})`);
    }
  } else {
    gpaScore = 50; // Neutral if missing
    concerns.push("GPA not provided");
  }

  // Test scores
  const sat = student.sat_score;
  const act = student.act_score;
  let testScore = 0;

  if (sat) {
    if (sat >= 1450) {
      testScore = 95;
      strengths.push(`Excellent SAT score (${sat})`);
    } else if (sat >= 1300) {
      testScore = 75;
      strengths.push(`Strong SAT score (${sat})`);
    } else if (sat >= 1150) {
      testScore = 55;
    } else {
      testScore = 35;
      concerns.push(`SAT score below competitive range (${sat})`);
    }
  } else if (act) {
    if (act >= 32) {
      testScore = 95;
      strengths.push(`Excellent ACT score (${act})`);
    } else if (act >= 28) {
      testScore = 75;
      strengths.push(`Strong ACT score (${act})`);
    } else if (act >= 24) {
      testScore = 55;
    } else {
      testScore = 35;
      concerns.push(`ACT score below competitive range (${act})`);
    }
  } else {
    testScore = 50;
    concerns.push("No standardized test scores provided");
  }

  // Class rank
  const classRank = student.class_rank;
  const classSize = student.class_size;
  let rankScore = 50; // Default
  let percentile = null;

  if (classRank && classSize) {
    percentile = (classRank / classSize) * 100;

    if (percentile <= 5) {
      rankScore = 100;
      strengths.push(`Top 5% class rank (${classRank}/${classSize})`);
    } else if (percentile <= 10) {
      rankScore = 90;
      strengths.push(`Top 10% class rank`);
    } else if (percentile <= 25) {
      rankScore = 70;
      strengths.push(`Top 25% class rank`);
    } else {
      rankScore = 50;
    }
  }

  // Course rigor (placeholder - would need course data)
  const rigorScore = 70; // Default assumption

  // Overall academic score
  const score = Math.round(
    gpaScore * 0.40 +
    testScore * 0.35 +
    rankScore * 0.15 +
    rigorScore * 0.10
  );

  let rating: "Excellent" | "Strong" | "Good" | "Fair" | "Weak";
  if (score >= 85) rating = "Excellent";
  else if (score >= 70) rating = "Strong";
  else if (score >= 55) rating = "Good";
  else if (score >= 40) rating = "Fair";
  else rating = "Weak";

  return {
    score,
    rating,
    factors: {
      gpa: { value: gpa, score: gpaScore },
      testScores: { sat, act, score: testScore },
      rigor: { score: rigorScore },
      classRank: { percentile, score: rankScore },
    },
    strengths,
    concerns,
  };
}

/**
 * Evaluate extracurricular strength
 */
async function evaluateExtracurriculars(student: any): Promise<{
  score: number;
  rating: "Exceptional" | "Strong" | "Good" | "Developing";
  tier1Count: number;
  tier2Count: number;
  topActivities: string[];
  strengths: string[];
  concerns: string[];
}> {
  if (!student.activities || student.activities.length === 0) {
    return {
      score: 20,
      rating: "Developing",
      tier1Count: 0,
      tier2Count: 0,
      topActivities: [],
      strengths: [],
      concerns: ["No extracurricular activities listed"],
    };
  }

  // Score activities
  const activityAnalysis = await scoreStudentActivities(student.id);

  const strengths: string[] = [];
  const concerns: string[] = [];

  // Analyze activity profile
  if (activityAnalysis.summary.tier1Count >= 2) {
    strengths.push(`${activityAnalysis.summary.tier1Count} Tier 1 (exceptional) activities`);
  } else if (activityAnalysis.summary.tier1Count === 0 && activityAnalysis.summary.tier2Count === 0) {
    concerns.push("No Tier 1 or Tier 2 activities - focus on depth and leadership");
  }

  if (student.activities.length >= 8) {
    strengths.push(`Well-rounded with ${student.activities.length} activities`);
  } else if (student.activities.length <= 3) {
    concerns.push("Limited activity count - consider adding meaningful involvements");
  }

  // Top activities
  const topActivities = activityAnalysis.activities
    .slice(0, 3)
    .map(a => a.activityName);

  return {
    score: activityAnalysis.summary.averageScore,
    rating: activityAnalysis.summary.overallStrength,
    tier1Count: activityAnalysis.summary.tier1Count,
    tier2Count: activityAnalysis.summary.tier2Count,
    topActivities,
    strengths,
    concerns,
  };
}

/**
 * Evaluate essay strength
 */
async function evaluateEssays(student: any): Promise<{
  score: number;
  rating: "Excellent" | "Strong" | "Good" | "Fair" | "Weak";
  averageQuality: number;
  essaysAnalyzed: number;
  strengths: string[];
  concerns: string[];
}> {
  const essays = student.essays || [];

  if (essays.length === 0) {
    return {
      score: 50, // Neutral - essays pending
      rating: "Fair",
      averageQuality: 0,
      essaysAnalyzed: 0,
      strengths: [],
      concerns: ["No essays submitted yet"],
    };
  }

  // Analyze essays (sample first 3 for performance)
  const essayScores: number[] = [];
  const strengths: string[] = [];
  const concerns: string[] = [];

  for (const essay of essays.slice(0, 3)) {
    if (essay.content && essay.content.length > 100) {
      try {
        const analysis = await analyzeEssay(essay.content);
        essayScores.push(analysis.overallScore);

        if (analysis.overallScore >= 80) {
          strengths.push(`Strong essay: ${essay.prompt?.substring(0, 50) || "Essay"}`);
        } else if (analysis.overallScore < 60) {
          concerns.push(`Essay needs improvement: ${essay.prompt?.substring(0, 50) || "Essay"}`);
        }

        // Check for clichés
        if (analysis.clicheDetection.severity === "high") {
          concerns.push("Multiple essays contain common clichés");
        }
      } catch (error) {
        console.error("Essay analysis failed:", error);
      }
    }
  }

  const averageQuality = essayScores.length > 0
    ? Math.round(essayScores.reduce((a, b) => a + b, 0) / essayScores.length)
    : 50;

  let rating: "Excellent" | "Strong" | "Good" | "Fair" | "Weak";
  if (averageQuality >= 85) rating = "Excellent";
  else if (averageQuality >= 70) rating = "Strong";
  else if (averageQuality >= 55) rating = "Good";
  else if (averageQuality >= 40) rating = "Fair";
  else rating = "Weak";

  if (essays.length >= 5) {
    strengths.push(`${essays.length} essays completed`);
  }

  return {
    score: averageQuality,
    rating,
    averageQuality,
    essaysAnalyzed: essayScores.length,
    strengths,
    concerns,
  };
}

/**
 * Evaluate recommendation letters
 */
function evaluateRecommendations(student: any): {
  score: number;
  rating: "Excellent" | "Strong" | "Good" | "Fair";
  recommenderCount: number;
  strengths: string[];
  concerns: string[];
} {
  const letters = student.letters_of_recommendation || [];
  const strengths: string[] = [];
  const concerns: string[] = [];

  let score = 50; // Base score

  if (letters.length >= 3) {
    score = 85;
    strengths.push(`${letters.length} letters of recommendation`);
  } else if (letters.length === 2) {
    score = 75;
    strengths.push("2 letters of recommendation (standard)");
  } else if (letters.length === 1) {
    score = 50;
    concerns.push("Only 1 letter of recommendation - aim for at least 2");
  } else {
    score = 30;
    concerns.push("No letters of recommendation yet");
  }

  // Check for variety
  const recommenderTypes = new Set(letters.map((l: any) => l.recommender_type));
  if (recommenderTypes.size >= 2) {
    strengths.push("Letters from diverse recommenders");
    score += 10;
  }

  score = Math.min(100, score);

  let rating: "Excellent" | "Strong" | "Good" | "Fair";
  if (score >= 80) rating = "Excellent";
  else if (score >= 65) rating = "Strong";
  else if (score >= 50) rating = "Good";
  else rating = "Fair";

  return {
    score,
    rating,
    recommenderCount: letters.length,
    strengths,
    concerns,
  };
}

/**
 * Assess competitiveness for different school tiers
 */
function assessCompetitiveness(
  overallScore: number,
  academicScore: number,
  extracurricularScore: number
): {
  safetySchools: string;
  targetSchools: string;
  reachSchools: string;
} {
  // Safety schools (acceptance rate >40%)
  let safetySchools = "Good Position";
  if (overallScore >= 75 && academicScore >= 70) {
    safetySchools = "Highly Competitive";
  } else if (overallScore >= 60) {
    safetySchools = "Competitive";
  }

  // Target schools (acceptance rate 20-40%)
  let targetSchools = "Challenging";
  if (overallScore >= 80 && academicScore >= 75) {
    targetSchools = "Competitive";
  } else if (overallScore >= 65) {
    targetSchools = "Moderate";
  }

  // Reach schools (acceptance rate <20%)
  let reachSchools = "Very Difficult";
  if (overallScore >= 90 && academicScore >= 85 && extracurricularScore >= 85) {
    reachSchools = "Possible";
  } else if (overallScore >= 75) {
    reachSchools = "Difficult";
  }

  return {
    safetySchools,
    targetSchools,
    reachSchools,
  };
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(
  academic: any,
  extracurricular: any,
  essays: any,
  recommendations: any,
  overallScore: number
): string[] {
  const recs: string[] = [];

  // Academic recommendations
  if (academic.score < 70) {
    if (academic.factors.testScores.score < 60) {
      recs.push("📚 Consider retaking standardized tests to improve scores");
    }
    if (academic.factors.gpa.value && academic.factors.gpa.value < 3.5) {
      recs.push("📖 Focus on maintaining/improving GPA in remaining semesters");
    }
  }

  // Extracurricular recommendations
  if (extracurricular.score < 65) {
    if (extracurricular.tier1Count === 0) {
      recs.push("🎯 Develop depth in 1-2 activities to reach Tier 1 level (leadership + impact)");
    }
    if (extracurricular.concerns.length > 0) {
      recs.push("🌟 Increase extracurricular involvement with focus on leadership roles");
    }
  }

  // Essay recommendations
  if (essays.score < 70) {
    recs.push("✍️ Invest time in revising essays - aim for unique topics and authentic voice");
  }
  if (essays.concerns.some((c: string) => c.includes("cliché"))) {
    recs.push("💡 Remove clichés and add specific, personal details to essays");
  }

  // Recommendations recommendations
  if (recommendations.recommenderCount < 2) {
    recs.push("👥 Secure at least 2 strong letters of recommendation");
  }

  // Strategic recommendations
  if (overallScore < 60) {
    recs.push("🎓 Consider building a balanced college list with more safety schools");
  }

  return recs.slice(0, 6); // Limit to top 6
}

/**
 * Generate AI-powered summary
 */
async function generateSummary(
  student: any,
  overallScore: number,
  rating: string,
  academic: any,
  extracurricular: any
): Promise<string> {
  const prompt = `Generate a 3-sentence summary of this student's college application strength.

Student: ${student.first_name} ${student.last_name}
Overall Score: ${overallScore}/100 (${rating})
Academic Rating: ${academic.rating} (${academic.score}/100)
Extracurricular Rating: ${extracurricular.rating} (${extracurricular.score}/100)

Academic Strengths: ${academic.strengths.join(", ") || "None"}
Academic Concerns: ${academic.concerns.join(", ") || "None"}
EC Strengths: ${extracurricular.strengths.join(", ") || "None"}

Provide an encouraging yet honest assessment highlighting their strongest areas and key opportunities for improvement.`;

  try {
    const response = await aiServiceManager.chat(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.6,
        maxTokens: 250,
      }
    );

    return response.content.trim();
  } catch (error) {
    return `${student.first_name}'s application strength is rated as ${rating} (${overallScore}/100). Academic profile is ${academic.rating.toLowerCase()} with ${extracurricular.rating.toLowerCase()} extracurricular involvement. ${
      overallScore >= 70
        ? "Competitive for target schools with strong positioning."
        : "Focus on strengthening key areas to improve competitiveness."
    }`;
  }
}
