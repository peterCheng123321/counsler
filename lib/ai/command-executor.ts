/**
 * Lightweight AI Command Executor
 * Interprets natural language commands and executes actions in context
 */

import { createLLM } from "./llm-factory";
import { z } from "zod";

export type CommandAction =
  | { type: "navigate"; path: string; description: string }
  | { type: "filter"; entity: "students" | "tasks"; filters: Record<string, any>; description: string }
  | { type: "search"; entity: "students" | "tasks"; query: string; description: string }
  | { type: "quick_view"; entity: "student" | "task"; id: string; name: string; description: string }
  | { type: "error"; message: string };

export interface CommandContext {
  currentPage: "students" | "tasks" | "chatbot" | "home";
  selectedStudentId?: string;
  selectedTaskId?: string;
  availableStudents?: Array<{ id: string; name: string }>;
  availableTasks?: Array<{ id: string; title: string }>;
}

const COMMAND_SYSTEM_PROMPT = `You are a lightweight AI command interpreter for a college application management system.

Your job is to interpret natural language commands and return structured actions to execute.

## Available Actions:

1. **navigate**: Navigate to a specific page
   - Examples: "go to students", "open tasks page", "show chatbot"
   - Paths: /students, /tasks, /chatbot, /students/{id}

2. **filter**: Apply filters on current page
   - Examples: "show high priority tasks", "students graduating 2025", "completed tasks"
   - Supports: status, priority, graduationYear, search

3. **search**: Search for entities
   - Examples: "find Sarah", "search MIT", "look for essay tasks"
   - Returns search query to execute

4. **quick_view**: Open a specific item's detail
   - Examples: "show Sarah's details", "open task about Stanford", "view John's profile"
   - Navigate directly to detail page

5. **error**: Command not understood or not possible

## Context Awareness:

You will receive context about:
- Current page the user is on
- Available students/tasks on current page
- Selected items

Use this context to disambiguate commands. For example:
- If user says "show details" and they're on students page with Sarah Williams visible, show Sarah's details
- If user says "filter high priority" on tasks page, filter tasks by priority=high

## Response Format:

Return a JSON object with the action structure. Examples:

\`\`\`json
{
  "type": "navigate",
  "path": "/students/123",
  "description": "Opening Sarah Williams' profile"
}
\`\`\`

\`\`\`json
{
  "type": "filter",
  "entity": "tasks",
  "filters": { "priority": "high", "status": "pending" },
  "description": "Showing high priority pending tasks"
}
\`\`\`

\`\`\`json
{
  "type": "search",
  "entity": "students",
  "query": "Sarah Williams",
  "description": "Searching for Sarah Williams"
}
\`\`\`

\`\`\`json
{
  "type": "quick_view",
  "entity": "student",
  "id": "123",
  "name": "Sarah Williams",
  "description": "Opening Sarah Williams' profile"
}
\`\`\`

\`\`\`json
{
  "type": "error",
  "message": "I couldn't understand that command. Try 'show students' or 'filter high priority tasks'"
}
\`\`\`

## Important Rules:

1. Be fast and decisive - choose the most likely action
2. Use context to disambiguate vague commands
3. If command is unclear, return error with helpful suggestion
4. Prefer quick_view when user mentions a specific name
5. Prefer filter when user mentions categories or attributes
6. Keep descriptions short and user-friendly
7. ONLY return the JSON, no other text`;

/**
 * Execute a natural language command with context
 */
export async function executeCommand(
  command: string,
  context: CommandContext
): Promise<CommandAction> {
  try {
    // Create lightweight LLM (prefer fast models)
    const llm = createLLM({
      temperature: 0.3, // Lower temperature for more predictable outputs
      maxTokens: 300, // Short responses only
      preferredProvider: "gemini", // Prefer Gemini Flash for speed
    });

    // Build context string
    const contextStr = buildContextString(context);

    // Build prompt
    const prompt = `${COMMAND_SYSTEM_PROMPT}

## Current Context:
${contextStr}

## User Command:
"${command}"

## Your Response (JSON only):`;

    console.log("[Command Executor] Processing command:", command);
    console.log("[Command Executor] Context:", context.currentPage);

    // Call LLM
    const response = await llm.invoke(prompt);
    const content = response.content.toString();

    console.log("[Command Executor] LLM Response:", content);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Command Executor] No JSON found in response");
      return {
        type: "error",
        message: "I couldn't process that command. Please try again.",
      };
    }

    const action = JSON.parse(jsonMatch[0]) as CommandAction;
    console.log("[Command Executor] Parsed action:", action);

    return action;
  } catch (error) {
    console.error("[Command Executor] Error:", error);
    return {
      type: "error",
      message: "Something went wrong. Please try again.",
    };
  }
}

/**
 * Build context string for LLM
 */
function buildContextString(context: CommandContext): string {
  let str = `- Current page: ${context.currentPage}\n`;

  if (context.selectedStudentId) {
    str += `- Selected student ID: ${context.selectedStudentId}\n`;
  }

  if (context.selectedTaskId) {
    str += `- Selected task ID: ${context.selectedTaskId}\n`;
  }

  if (context.availableStudents && context.availableStudents.length > 0) {
    str += `- Visible students: ${context.availableStudents
      .slice(0, 10)
      .map((s) => `${s.name} (id: ${s.id})`)
      .join(", ")}\n`;
  }

  if (context.availableTasks && context.availableTasks.length > 0) {
    str += `- Visible tasks: ${context.availableTasks
      .slice(0, 10)
      .map((t) => `"${t.title}" (id: ${t.id})`)
      .join(", ")}\n`;
  }

  return str;
}

/**
 * Parse filter parameters from natural language
 */
export function parseFilters(entity: "students" | "tasks", filters: Record<string, any>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  return params.toString();
}
