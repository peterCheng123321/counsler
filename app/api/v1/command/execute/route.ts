import { NextRequest, NextResponse } from "next/server";
import { executeCommand, type CommandContext } from "@/lib/ai/command-executor";
import { z } from "zod";

const executeCommandSchema = z.object({
  command: z.string().min(1).max(500),
  context: z.object({
    currentPage: z.enum(["students", "tasks", "chatbot", "home"]),
    selectedStudentId: z.string().optional(),
    selectedTaskId: z.string().optional(),
    availableStudents: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })).optional(),
    availableTasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
    })).optional(),
  }),
});

/**
 * Execute a natural language command with AI
 * POST /api/v1/command/execute
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, context } = executeCommandSchema.parse(body);

    console.log("[Command API] Executing command:", command);
    console.log("[Command API] Context:", context.currentPage);

    // Execute command using server-side AI
    const action = await executeCommand(command, context);

    console.log("[Command API] Action:", action);

    return NextResponse.json({
      success: true,
      data: action,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[Command API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute command",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
