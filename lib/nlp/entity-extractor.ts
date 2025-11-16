/**
 * Natural Language Processing Utility
 * Extracts entities, intents, and context from user messages
 * Uses compromise library for lightweight, fast NLP
 */

import nlp from "compromise";
import dates from "compromise-dates";
// @ts-ignore - Type declaration issue with compromise-numbers package exports
import numbers from "compromise-numbers";

// Extend compromise with plugins
nlp.extend(dates);
nlp.extend(numbers);

export interface ExtractedEntities {
  people: Array<{ text: string; firstName?: string; lastName?: string }>;
  colleges: string[];
  dates: Array<{ text: string; date?: Date }>;
  numbers: Array<{ text: string; value?: number }>;
  emails: string[];
  topics: string[];
  intent: {
    action?: "generate" | "create" | "show" | "find" | "search" | "update" | "delete" | "list" | "view" | "open" | "write";
    target?: "letter" | "recommendation" | "essay" | "student" | "task" | "college" | "application" | "profile";
    modifiers?: string[];
  };
  fullText: string;
}

/**
 * Extract all entities from a text using NLP
 */
export function extractEntities(text: string): ExtractedEntities {
  const doc = nlp(text);

  // Extract people/names
  const people = doc.people().json().map((person: any) => ({
    text: person.text,
    firstName: person.firstName,
    lastName: person.lastName,
  }));

  // Extract dates
  // @ts-ignore - dates() method added by compromise-dates plugin
  const dates = doc.dates().json().map((date: any) => ({
    text: date.text,
    date: date.date ? new Date(date.date) : undefined,
  }));

  // Extract numbers (GPAs, scores, years)
  const numbers = doc.numbers().json().map((num: any) => ({
    text: num.text,
    value: num.number,
  }));

  // Extract emails
  const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];

  // Extract college names (common patterns)
  const colleges = extractColleges(text);

  // Extract topics/subjects
  const topics = extractTopics(doc);

  // Detect intent
  const intent = detectIntent(doc, text);

  return {
    people,
    colleges,
    dates,
    numbers,
    emails,
    topics,
    intent,
    fullText: text,
  };
}

/**
 * Extract college names from text
 */
function extractColleges(text: string): string[] {
  const colleges: string[] = [];

  // Common college patterns
  const collegePatterns = [
    /\b([A-Z][a-z]+ )?University of [A-Z][a-z]+( [A-Z][a-z]+)?\b/g,
    /\b[A-Z][a-z]+ (University|College|Institute)\b/g,
    /\b(MIT|UCLA|USC|NYU|BU|BC)\b/g,
  ];

  collegePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      colleges.push(...matches);
    }
  });

  return [...new Set(colleges)]; // Remove duplicates
}

/**
 * Extract topics and subjects from document
 */
function extractTopics(doc: any): string[] {
  const topics: string[] = [];

  // Extract nouns as potential topics
  const nouns = doc.nouns().json().map((n: any) => n.text);

  // Extract specific academic/college-related terms
  const relevantTopics = nouns.filter((noun: string) => {
    const lower = noun.toLowerCase();
    return (
      lower.includes("essay") ||
      lower.includes("letter") ||
      lower.includes("recommendation") ||
      lower.includes("application") ||
      lower.includes("gpa") ||
      lower.includes("sat") ||
      lower.includes("act") ||
      lower.includes("college") ||
      lower.includes("university") ||
      lower.includes("student") ||
      lower.includes("scholarship") ||
      lower.includes("deadline")
    );
  });

  topics.push(...relevantTopics);

  return [...new Set(topics)];
}

/**
 * Detect user intent from text
 */
function detectIntent(doc: any, text: string): ExtractedEntities["intent"] {
  const lower = text.toLowerCase();

  // Detect action verbs
  let action: ExtractedEntities["intent"]["action"];

  if (
    lower.includes("generate") ||
    lower.includes("create") ||
    lower.includes("write") ||
    lower.includes("make")
  ) {
    action = "generate";
  } else if (
    lower.includes("show") ||
    lower.includes("display") ||
    lower.includes("view") ||
    lower.includes("see")
  ) {
    action = "show";
  } else if (
    lower.includes("find") ||
    lower.includes("search") ||
    lower.includes("look for") ||
    lower.includes("get")
  ) {
    action = "search";
  } else if (
    lower.includes("update") ||
    lower.includes("change") ||
    lower.includes("modify") ||
    lower.includes("edit")
  ) {
    action = "update";
  } else if (lower.includes("list") || lower.includes("all")) {
    action = "list";
  } else if (lower.includes("open")) {
    action = "open";
  }

  // Detect target entity
  let target: ExtractedEntities["intent"]["target"];

  if (
    lower.includes("letter") ||
    lower.includes("recommendation") ||
    lower.includes("rec letter") ||
    lower.includes("lor")
  ) {
    target = "letter";
  } else if (lower.includes("essay")) {
    target = "essay";
  } else if (lower.includes("student")) {
    target = "student";
  } else if (lower.includes("task")) {
    target = "task";
  } else if (lower.includes("college") || lower.includes("university")) {
    target = "college";
  } else if (lower.includes("application")) {
    target = "application";
  } else if (lower.includes("profile")) {
    target = "profile";
  }

  // Extract modifiers (adjectives, qualities)
  const adjectives = doc.adjectives().json().map((adj: any) => adj.text);

  return {
    action,
    target,
    modifiers: adjectives,
  };
}

/**
 * Extract student name from text with smart resolution
 */
export function extractStudentName(text: string): {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  searchTerm?: string;
} {
  const doc = nlp(text);
  const people = doc.people().json();

  if (people.length === 0) {
    // Try to extract from common patterns
    const nameMatch = text.match(/\b(?:student|for|about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i);
    if (nameMatch) {
      const name = nameMatch[1];
      const parts = name.split(" ");
      return {
        searchTerm: name,
        firstName: parts[0],
        lastName: parts.length > 1 ? parts[parts.length - 1] : undefined,
        fullName: name,
      };
    }
    return {};
  }

  const person = people[0];
  return {
    fullName: person.text,
    firstName: person.firstName,
    lastName: person.lastName,
    searchTerm: person.text,
  };
}

/**
 * Extract GPA from text
 */
export function extractGPA(text: string): number | undefined {
  const gpaMatch = text.match(/\b(\d\.\d{1,2})\s*(?:gpa|GPA)?\b/i);
  if (gpaMatch) {
    const gpa = parseFloat(gpaMatch[1]);
    if (gpa >= 0 && gpa <= 5.0) {
      return gpa;
    }
  }
  return undefined;
}

/**
 * Extract test scores (SAT/ACT) from text
 */
export function extractTestScores(text: string): {
  sat?: number;
  act?: number;
} {
  const scores: { sat?: number; act?: number } = {};

  const satMatch = text.match(/\b(?:SAT|sat)\s*:?\s*(\d{3,4})\b/i);
  if (satMatch) {
    scores.sat = parseInt(satMatch[1]);
  }

  const actMatch = text.match(/\b(?:ACT|act)\s*:?\s*(\d{1,2})\b/i);
  if (actMatch) {
    scores.act = parseInt(actMatch[1]);
  }

  return scores;
}

/**
 * Extract all college-related information from text
 */
export function extractCollegeInfo(text: string): {
  college?: string;
  program?: string;
  major?: string;
  deadline?: Date;
} {
  const entities = extractEntities(text);

  const college = entities.colleges[0];

  // Extract program/major
  const programMatch = text.match(/\b(?:for|in|studying|major in|program in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i);
  const program = programMatch ? programMatch[1] : undefined;

  const deadline = entities.dates[0]?.date;

  return {
    college,
    program,
    major: program,
    deadline,
  };
}

/**
 * Build intelligent search query from natural language
 */
export function buildSearchQuery(text: string): {
  studentSearch?: string;
  filters?: {
    gpa?: number;
    minGPA?: number;
    maxGPA?: number;
    graduationYear?: number;
    hasEssay?: boolean;
    hasApplication?: boolean;
  };
  intent: ExtractedEntities["intent"];
} {
  const entities = extractEntities(text);
  const gpa = extractGPA(text);
  const testScores = extractTestScores(text);
  const lower = text.toLowerCase();

  // Extract graduation year
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const graduationYear = yearMatch ? parseInt(yearMatch[1]) : undefined;

  // Determine student search term
  const studentName = extractStudentName(text);

  // Detect GPA comparisons (above/below/greater/less)
  let minGPA: number | undefined;
  let maxGPA: number | undefined;

  if (gpa) {
    if (lower.includes("above") || lower.includes("greater") || lower.includes("more than") || lower.includes(">")) {
      minGPA = gpa;
    } else if (lower.includes("below") || lower.includes("less") || lower.includes("under") || lower.includes("<")) {
      maxGPA = gpa;
    } else if (lower.includes("at least") || lower.includes("minimum")) {
      minGPA = gpa;
    } else if (lower.includes("at most") || lower.includes("maximum")) {
      maxGPA = gpa;
    } else {
      // Exact match if no comparator
      // Don't set minGPA/maxGPA
    }
  }

  return {
    studentSearch: studentName.searchTerm,
    filters: {
      gpa: !minGPA && !maxGPA ? gpa : undefined,
      minGPA,
      maxGPA,
      graduationYear: graduationYear,
      hasEssay: lower.includes("has essay") || lower.includes("with essay"),
      hasApplication: lower.includes("applied") || lower.includes("application"),
    },
    intent: entities.intent,
  };
}
