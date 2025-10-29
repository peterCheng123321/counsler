/**
 * AI-Powered Essay Analysis Engine
 * Analyzes college application essays for quality, effectiveness, and areas of improvement
 */

import { aiServiceManager } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export interface EssayAnalysis {
  overallScore: number; // 0-100
  dimensions: {
    contentQuality: number; // Topic relevance, personal insight
    writingQuality: number; // Grammar, style, coherence
    authenticity: number; // Personal voice, genuine storytelling
    impact: number; // Memorability, emotional resonance
    structure: number; // Organization, flow, transitions
  };
  strengths: string[];
  improvements: string[];
  clicheDetection: {
    found: boolean;
    cliches: string[];
    severity: "low" | "medium" | "high";
  };
  wordChoiceAnalysis: {
    sophisticationScore: number; // 0-100
    passiveVoiceCount: number;
    weakVerbs: string[];
    powerfulPhrases: string[];
  };
  topicAnalysis: {
    uniqueness: number; // 0-100
    personalGrowth: boolean;
    specificity: number; // 0-100
    recommendedRevisions: string[];
  };
  summary: string;
}

const COMMON_CLICHES = [
  "worked hard",
  "gave 110%",
  "since I was a child",
  "passion for helping others",
  "changed my life",
  "realized the importance of",
  "taught me a valuable lesson",
  "I have always wanted to",
  "follow my dreams",
  "make a difference in the world",
  "changed my perspective",
  "stepping out of my comfort zone",
];

const WEAK_VERBS = [
  "is", "was", "are", "were", "be", "being", "been",
  "has", "have", "had", "do", "does", "did",
  "get", "got", "make", "made", "go", "went",
];

/**
 * Analyze an essay using AI and NLP techniques
 */
export async function analyzeEssay(essayContent: string): Promise<EssayAnalysis> {
  // Basic validations
  if (!essayContent || essayContent.trim().length < 50) {
    throw new Error("Essay content too short for meaningful analysis");
  }

  const wordCount = essayContent.split(/\s+/).length;

  // Parallel analysis: AI-powered + rule-based
  const [aiAnalysis, linguisticAnalysis] = await Promise.all([
    getAIEssayAnalysis(essayContent),
    analyzeLinguisticPatterns(essayContent),
  ]);

  // Combine results
  const clicheDetection = detectCliches(essayContent);
  const wordChoiceAnalysis = analyzeWordChoice(essayContent);
  const topicAnalysis = await analyzeTopicUniqueness(essayContent);

  // Calculate dimension scores
  const dimensions = {
    contentQuality: aiAnalysis.contentScore || 70,
    writingQuality: linguisticAnalysis.grammarScore,
    authenticity: aiAnalysis.authenticityScore || 75,
    impact: aiAnalysis.impactScore || 70,
    structure: linguisticAnalysis.structureScore,
  };

  // Overall score (weighted average)
  const overallScore = Math.round(
    dimensions.contentQuality * 0.3 +
    dimensions.writingQuality * 0.25 +
    dimensions.authenticity * 0.2 +
    dimensions.impact * 0.15 +
    dimensions.structure * 0.1
  );

  return {
    overallScore,
    dimensions,
    strengths: aiAnalysis.strengths || [],
    improvements: aiAnalysis.improvements || [],
    clicheDetection,
    wordChoiceAnalysis,
    topicAnalysis,
    summary: aiAnalysis.summary || `Essay scored ${overallScore}/100 with ${wordCount} words.`,
  };
}

/**
 * Get AI-powered analysis using LLM
 */
async function getAIEssayAnalysis(essayContent: string): Promise<{
  contentScore: number;
  authenticityScore: number;
  impactScore: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}> {
  const prompt = `You are an expert college admissions essay reviewer. Analyze this college application essay and provide detailed feedback.

Essay:
"""
${essayContent}
"""

Analyze the essay on these dimensions (score 0-100 for each):
1. Content Quality: Does the essay reveal genuine personal insight? Is the topic compelling?
2. Authenticity: Does it sound like the student's authentic voice, or generic/forced?
3. Impact: Will this essay be memorable to admissions officers?

Also identify:
- Top 3 strengths of the essay
- Top 3 areas for improvement
- A 2-sentence summary of the essay's effectiveness

Respond ONLY with valid JSON in this exact format:
{
  "contentScore": <number 0-100>,
  "authenticityScore": <number 0-100>,
  "impactScore": <number 0-100>,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "summary": "2-sentence summary here"
}`;

  try {
    const response = await aiServiceManager.chat(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 800,
      }
    );

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    console.error("AI essay analysis failed:", error);
    // Fallback to basic analysis
    return {
      contentScore: 65,
      authenticityScore: 70,
      impactScore: 65,
      strengths: ["Clear narrative structure"],
      improvements: ["Add more specific details", "Strengthen personal reflection"],
      summary: "Essay shows promise but needs development in specificity and personal insight.",
    };
  }
}

/**
 * Analyze linguistic patterns (grammar, structure, coherence)
 */
function analyzeLinguisticPatterns(essayContent: string): {
  grammarScore: number;
  structureScore: number;
} {
  const sentences = essayContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = essayContent.split(/\n\n+/).filter(p => p.trim().length > 0);
  const words = essayContent.split(/\s+/);

  // Grammar heuristics
  let grammarScore = 100;

  // Penalize very short or very long sentences
  const avgSentenceLength = words.length / sentences.length;
  if (avgSentenceLength < 10) grammarScore -= 10; // Too choppy
  if (avgSentenceLength > 30) grammarScore -= 10; // Too complex

  // Check for sentence variety
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  const lengthVariance = calculateVariance(sentenceLengths);
  if (lengthVariance < 20) grammarScore -= 5; // Monotonous rhythm

  // Structure heuristics
  let structureScore = 100;

  // Check paragraph count (3-6 is ideal for most essays)
  if (paragraphs.length < 3) structureScore -= 20;
  if (paragraphs.length > 7) structureScore -= 10;

  // Check for introduction and conclusion
  const firstParagraph = paragraphs[0];
  const lastParagraph = paragraphs[paragraphs.length - 1];

  if (firstParagraph.split(/\s+/).length < 30) structureScore -= 10; // Weak intro
  if (lastParagraph.split(/\s+/).length < 30) structureScore -= 10; // Weak conclusion

  // Check for transitions (basic heuristic)
  const transitionWords = [
    "however", "moreover", "furthermore", "nevertheless", "therefore",
    "consequently", "meanwhile", "subsequently", "additionally", "similarly",
  ];
  const transitionCount = transitionWords.filter(word =>
    essayContent.toLowerCase().includes(word)
  ).length;

  if (transitionCount < 2) structureScore -= 10; // Lacks coherence markers

  return {
    grammarScore: Math.max(0, Math.min(100, grammarScore)),
    structureScore: Math.max(0, Math.min(100, structureScore)),
  };
}

/**
 * Detect common clichés
 */
function detectCliches(essayContent: string): {
  found: boolean;
  cliches: string[];
  severity: "low" | "medium" | "high";
} {
  const lowerContent = essayContent.toLowerCase();
  const foundCliches = COMMON_CLICHES.filter(cliche =>
    lowerContent.includes(cliche.toLowerCase())
  );

  let severity: "low" | "medium" | "high" = "low";
  if (foundCliches.length >= 5) severity = "high";
  else if (foundCliches.length >= 3) severity = "medium";

  return {
    found: foundCliches.length > 0,
    cliches: foundCliches,
    severity,
  };
}

/**
 * Analyze word choice sophistication
 */
function analyzeWordChoice(essayContent: string): {
  sophisticationScore: number;
  passiveVoiceCount: number;
  weakVerbs: string[];
  powerfulPhrases: string[];
} {
  const words = essayContent.toLowerCase().split(/\s+/);
  const sentences = essayContent.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Count weak verbs
  const weakVerbsFound = WEAK_VERBS.filter(verb =>
    words.includes(verb)
  );

  // Detect passive voice (simple heuristic: "was/were" + past participle)
  const passivePatterns = [
    /\bwas\s+\w+ed\b/gi,
    /\bwere\s+\w+ed\b/gi,
    /\bbeen\s+\w+ed\b/gi,
  ];
  let passiveVoiceCount = 0;
  passivePatterns.forEach(pattern => {
    const matches = essayContent.match(pattern);
    if (matches) passiveVoiceCount += matches.length;
  });

  // Calculate sophistication score
  const uniqueWords = new Set(words.filter(w => w.length > 3));
  const vocabularyRichness = uniqueWords.size / words.length;

  let sophisticationScore = 50; // Base score
  sophisticationScore += vocabularyRichness * 100; // More unique words = higher score
  sophisticationScore -= weakVerbsFound.length * 2; // Penalize weak verbs
  sophisticationScore -= passiveVoiceCount * 3; // Penalize passive voice

  sophisticationScore = Math.max(0, Math.min(100, sophisticationScore));

  // Detect powerful phrases (action-oriented, specific)
  const powerfulPhrases: string[] = [];
  const actionVerbs = [
    "led", "created", "designed", "implemented", "launched",
    "transformed", "discovered", "achieved", "pioneered",
  ];
  actionVerbs.forEach(verb => {
    if (essayContent.toLowerCase().includes(verb)) {
      powerfulPhrases.push(verb);
    }
  });

  return {
    sophisticationScore: Math.round(sophisticationScore),
    passiveVoiceCount,
    weakVerbs: weakVerbsFound.slice(0, 5), // Top 5
    powerfulPhrases,
  };
}

/**
 * Analyze topic uniqueness and specificity
 */
async function analyzeTopicUniqueness(essayContent: string): Promise<{
  uniqueness: number;
  personalGrowth: boolean;
  specificity: number;
  recommendedRevisions: string[];
}> {
  const prompt = `Analyze this college essay topic for uniqueness and specificity.

Essay excerpt:
"""
${essayContent.substring(0, 500)}...
"""

Evaluate:
1. Topic uniqueness (0-100): How distinctive is this topic compared to typical college essays?
2. Personal growth: Does the essay demonstrate personal development or reflection?
3. Specificity (0-100): How specific are the details and examples?
4. Recommended revisions: What 2-3 specific changes would make this essay stronger?

Respond with JSON:
{
  "uniqueness": <number>,
  "personalGrowth": <boolean>,
  "specificity": <number>,
  "recommendedRevisions": ["revision1", "revision2"]
}`;

  try {
    const response = await aiServiceManager.chat(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.3,
        maxTokens: 400,
      }
    );

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    return {
      uniqueness: 60,
      personalGrowth: true,
      specificity: 55,
      recommendedRevisions: [
        "Add more specific details and examples",
        "Show rather than tell your personal growth",
      ],
    };
  }
}

/**
 * Calculate variance for sentence length analysis
 */
function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Save essay analysis to database
 */
export async function saveEssayAnalysis(
  essayId: string,
  analysis: EssayAnalysis
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Save to insights table
  const { error } = await supabase.from("ai_insights").insert({
    entity_type: "essay",
    entity_id: essayId,
    kind: "essay_analysis",
    content: analysis.summary,
    metadata: {
      overallScore: analysis.overallScore,
      dimensions: analysis.dimensions,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      clicheDetection: analysis.clicheDetection,
      wordChoiceAnalysis: analysis.wordChoiceAnalysis,
      topicAnalysis: analysis.topicAnalysis,
    },
    generated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to save essay analysis:", error);
    throw new Error("Failed to save analysis");
  }
}
