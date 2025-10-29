/**
 * Activity Strength Scoring System
 * Evaluates extracurricular activities for impact, leadership, and distinctiveness
 */

import { aiServiceManager } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export interface ActivityScore {
  activityId: string;
  activityName: string;
  overallScore: number; // 0-100
  dimensions: {
    leadership: number; // 0-100
    impact: number; // 0-100
    timeCommitment: number; // 0-100
    uniqueness: number; // 0-100
    relevance: number; // 0-100 (to intended major/interests)
  };
  tier: 1 | 2 | 3 | 4; // Admissions tiers (1 = highest)
  strengths: string[];
  improvements: string[];
  narrative: string;
}

export interface Activity {
  id: string;
  name: string;
  description?: string;
  participation_grades?: string[];
  participation_timing?: string;
  hours_per_week?: number;
  weeks_per_year?: number;
  leadership_positions?: string[];
  honors_received?: string[];
}

/**
 * Score an individual activity
 */
export async function scoreActivity(
  activity: Activity,
  intendedMajor?: string
): Promise<ActivityScore> {
  // Calculate dimension scores
  const leadership = calculateLeadershipScore(activity);
  const impact = await calculateImpactScore(activity);
  const timeCommitment = calculateTimeCommitmentScore(activity);
  const uniqueness = await calculateUniquenessScore(activity);
  const relevance = await calculateRelevanceScore(activity, intendedMajor);

  // Calculate overall score (weighted)
  const overallScore = Math.round(
    leadership * 0.25 +
    impact * 0.30 +
    timeCommitment * 0.15 +
    uniqueness * 0.20 +
    relevance * 0.10
  );

  // Determine tier
  const tier = determineTier(overallScore, leadership, impact, uniqueness);

  // Generate narrative
  const narrative = await generateActivityNarrative(activity, overallScore, tier);

  // Identify strengths and improvements
  const { strengths, improvements } = analyzeActivity(
    activity,
    { leadership, impact, timeCommitment, uniqueness, relevance }
  );

  return {
    activityId: activity.id,
    activityName: activity.name,
    overallScore,
    dimensions: {
      leadership,
      impact,
      timeCommitment,
      uniqueness,
      relevance,
    },
    tier,
    strengths,
    improvements,
    narrative,
  };
}

/**
 * Calculate leadership score based on positions held
 */
function calculateLeadershipScore(activity: Activity): number {
  const positions = activity.leadership_positions || [];

  if (positions.length === 0) return 20; // Minimal leadership

  let score = 30; // Base for any leadership

  // Score based on level of leadership
  const leadershipKeywords = {
    high: ["president", "founder", "captain", "chair", "director", "chief"],
    medium: ["vice president", "vp", "secretary", "treasurer", "co-founder", "lead"],
    low: ["member", "participant", "volunteer", "assistant"],
  };

  positions.forEach(position => {
    const positionLower = position.toLowerCase();

    if (leadershipKeywords.high.some(kw => positionLower.includes(kw))) {
      score += 35;
    } else if (leadershipKeywords.medium.some(kw => positionLower.includes(kw))) {
      score += 20;
    } else if (!leadershipKeywords.low.some(kw => positionLower.includes(kw))) {
      score += 10; // Other leadership role
    }
  });

  // Multiple leadership positions bonus
  if (positions.length >= 2) score += 15;

  return Math.min(100, score);
}

/**
 * Calculate impact score using AI analysis
 */
async function calculateImpactScore(activity: Activity): Promise<number> {
  const description = activity.description || "";
  const honors = activity.honors_received || [];

  // If no description, use heuristics
  if (!description && honors.length === 0) {
    return 40; // Default moderate impact
  }

  // Base score on honors/recognition
  let score = 30;

  const impactKeywords = [
    "awarded", "recognized", "selected", "won", "achieved",
    "state", "national", "international", "regional",
    "published", "presented", "performed",
  ];

  const descriptionLower = description.toLowerCase();
  const impactMentions = impactKeywords.filter(kw =>
    descriptionLower.includes(kw) || honors.some(h => h.toLowerCase().includes(kw))
  ).length;

  score += impactMentions * 10;

  // Honors received
  honors.forEach(honor => {
    const honorLower = honor.toLowerCase();
    if (honorLower.includes("national")) score += 25;
    else if (honorLower.includes("state")) score += 15;
    else if (honorLower.includes("regional")) score += 10;
    else score += 5;
  });

  return Math.min(100, score);
}

/**
 * Calculate time commitment score
 */
function calculateTimeCommitmentScore(activity: Activity): number {
  const hoursPerWeek = activity.hours_per_week || 0;
  const weeksPerYear = activity.weeks_per_year || 0;
  const totalHours = hoursPerWeek * weeksPerYear;

  // Year-round activity bonus
  const yearRound = weeksPerYear >= 48;

  let score = 0;

  // Score based on total annual hours
  if (totalHours >= 400) score = 100; // Exceptional commitment (8+ hrs/week year-round)
  else if (totalHours >= 250) score = 85; // Very high
  else if (totalHours >= 150) score = 70; // High
  else if (totalHours >= 80) score = 55; // Moderate
  else if (totalHours >= 40) score = 40; // Low-moderate
  else score = 25; // Minimal

  // Year-round bonus
  if (yearRound && score < 90) score += 10;

  return Math.min(100, score);
}

/**
 * Calculate uniqueness score using AI
 */
async function calculateUniquenessScore(activity: Activity): Promise<number> {
  const commonActivities = [
    "national honor society", "nhs", "key club", "student government",
    "soccer", "basketball", "football", "volleyball", "track",
    "volunteering", "community service", "tutoring",
  ];

  const activityNameLower = activity.name.toLowerCase();

  // Check if it's a common activity
  const isCommon = commonActivities.some(common =>
    activityNameLower.includes(common)
  );

  let score = isCommon ? 35 : 60; // Base score

  // Boost for unique aspects
  const description = activity.description || "";
  const descriptionLower = description.toLowerCase();

  const uniquenessIndicators = [
    "founded", "created", "launched", "developed", "designed",
    "unique", "first", "only", "innovative", "novel",
  ];

  const uniquenessMentions = uniquenessIndicators.filter(kw =>
    descriptionLower.includes(kw)
  ).length;

  score += uniquenessMentions * 15;

  // Honors boost uniqueness
  const honors = activity.honors_received || [];
  if (honors.length > 0) score += 10;

  return Math.min(100, score);
}

/**
 * Calculate relevance to intended major
 */
async function calculateRelevanceScore(
  activity: Activity,
  intendedMajor?: string
): Promise<number> {
  if (!intendedMajor) return 50; // Neutral if no major specified

  const prompt = `Rate the relevance of this extracurricular activity to the intended major on a scale of 0-100.

Activity: ${activity.name}
Description: ${activity.description || "N/A"}
Intended Major: ${intendedMajor}

Consider:
- Direct alignment with major field
- Development of relevant skills
- Demonstration of interest in the field

Respond with ONLY a number between 0-100.`;

  try {
    const response = await aiServiceManager.chat(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.3,
        maxTokens: 50,
      }
    );

    const scoreMatch = response.content.match(/\d+/);
    if (scoreMatch) {
      return Math.min(100, Math.max(0, parseInt(scoreMatch[0])));
    }
  } catch (error) {
    console.error("Failed to calculate relevance score:", error);
  }

  return 50; // Default
}

/**
 * Determine admissions tier
 * Tier 1: National/international impact, exceptional
 * Tier 2: State-level recognition, strong leadership
 * Tier 3: Regional/school-level achievement
 * Tier 4: Participation without significant achievement
 */
function determineTier(
  overallScore: number,
  leadership: number,
  impact: number,
  uniqueness: number
): 1 | 2 | 3 | 4 {
  // Tier 1: Exceptional (top tier for admissions)
  if (overallScore >= 85 && (leadership >= 80 || impact >= 85 || uniqueness >= 85)) {
    return 1;
  }

  // Tier 2: Very Strong
  if (overallScore >= 70 && (leadership >= 60 || impact >= 70)) {
    return 2;
  }

  // Tier 3: Solid
  if (overallScore >= 50) {
    return 3;
  }

  // Tier 4: Participation
  return 4;
}

/**
 * Generate narrative description of activity using AI
 */
async function generateActivityNarrative(
  activity: Activity,
  score: number,
  tier: number
): Promise<string> {
  const prompt = `Write a 2-sentence evaluation of this extracurricular activity for college admissions.

Activity: ${activity.name}
Description: ${activity.description || "N/A"}
Leadership: ${activity.leadership_positions?.join(", ") || "None"}
Honors: ${activity.honors_received?.join(", ") || "None"}
Hours: ${activity.hours_per_week || 0}/week for ${activity.weeks_per_year || 0} weeks/year

Overall Score: ${score}/100
Tier: ${tier} (1=exceptional, 4=participation)

Provide a concise evaluation highlighting the activity's strengths and admissions value.`;

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
    // Fallback narrative
    const tierDescriptions = {
      1: "exceptional and highly distinctive",
      2: "very strong with significant impact",
      3: "solid with good engagement",
      4: "demonstrates participation",
    };

    return `This activity is ${tierDescriptions[tier as keyof typeof tierDescriptions]} (Tier ${tier}). Score: ${score}/100, showing ${activity.leadership_positions?.length ? "leadership experience" : "consistent participation"}.`;
  }
}

/**
 * Analyze activity to identify strengths and improvements
 */
function analyzeActivity(
  activity: Activity,
  dimensions: {
    leadership: number;
    impact: number;
    timeCommitment: number;
    uniqueness: number;
    relevance: number;
  }
): { strengths: string[]; improvements: string[] } {
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Leadership
  if (dimensions.leadership >= 75) {
    strengths.push("Strong leadership demonstrated");
  } else if (dimensions.leadership < 40) {
    improvements.push("Seek leadership opportunities within this activity");
  }

  // Impact
  if (dimensions.impact >= 75) {
    strengths.push("Significant measurable impact");
  } else if (dimensions.impact < 50) {
    improvements.push("Document specific achievements and outcomes");
  }

  // Time commitment
  if (dimensions.timeCommitment >= 70) {
    strengths.push("Substantial time investment shows dedication");
  } else if (dimensions.timeCommitment < 40) {
    improvements.push("Consider increasing involvement or hours");
  }

  // Uniqueness
  if (dimensions.uniqueness >= 70) {
    strengths.push("Distinctive activity that stands out");
  } else if (dimensions.uniqueness < 40) {
    improvements.push("Find ways to differentiate your involvement");
  }

  // Honors/recognition
  if (activity.honors_received && activity.honors_received.length > 0) {
    strengths.push(`${activity.honors_received.length} honor(s) received`);
  } else {
    improvements.push("Pursue recognition or awards related to this activity");
  }

  return { strengths, improvements };
}

/**
 * Score all activities for a student
 */
export async function scoreStudentActivities(
  studentId: string,
  intendedMajor?: string
): Promise<{
  activities: ActivityScore[];
  summary: {
    averageScore: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    tier4Count: number;
    topActivity: ActivityScore | null;
    overallStrength: "Exceptional" | "Strong" | "Good" | "Developing";
  };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get student activities
  const { data: activities, error } = await supabase
    .from("activities")
    .select("*")
    .eq("student_id", studentId);

  if (error) {
    throw new Error("Failed to fetch activities");
  }

  if (!activities || activities.length === 0) {
    return {
      activities: [],
      summary: {
        averageScore: 0,
        tier1Count: 0,
        tier2Count: 0,
        tier3Count: 0,
        tier4Count: 0,
        topActivity: null,
        overallStrength: "Developing",
      },
    };
  }

  // Score each activity
  const scoredActivities: ActivityScore[] = [];

  for (const activity of activities) {
    const score = await scoreActivity(activity, intendedMajor);
    scoredActivities.push(score);
  }

  // Calculate summary
  const averageScore = Math.round(
    scoredActivities.reduce((sum, a) => sum + a.overallScore, 0) / scoredActivities.length
  );

  const tierCounts = {
    tier1Count: scoredActivities.filter(a => a.tier === 1).length,
    tier2Count: scoredActivities.filter(a => a.tier === 2).length,
    tier3Count: scoredActivities.filter(a => a.tier === 3).length,
    tier4Count: scoredActivities.filter(a => a.tier === 4).length,
  };

  const topActivity = scoredActivities.sort((a, b) => b.overallScore - a.overallScore)[0];

  let overallStrength: "Exceptional" | "Strong" | "Good" | "Developing";
  if (tierCounts.tier1Count >= 2 || averageScore >= 80) {
    overallStrength = "Exceptional";
  } else if (tierCounts.tier1Count >= 1 || tierCounts.tier2Count >= 3 || averageScore >= 70) {
    overallStrength = "Strong";
  } else if (averageScore >= 55) {
    overallStrength = "Good";
  } else {
    overallStrength = "Developing";
  }

  return {
    activities: scoredActivities.sort((a, b) => b.overallScore - a.overallScore),
    summary: {
      averageScore,
      ...tierCounts,
      topActivity,
      overallStrength,
    },
  };
}
