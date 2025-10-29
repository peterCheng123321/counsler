import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiServiceManager } from "@/lib/ai";
import { aiTools, executeTool } from "@/lib/ai/tools";
import { AIMessage, AIToolCall } from "@/lib/ai/types";
import { queryCache } from "@/lib/cache/query-cache";
import { z } from "zod";

const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  stream: z.boolean().optional().default(true),
});

const HISTORY_LIMIT = 10; // Limit conversation history to last 10 messages

const SYSTEM_PROMPT = `You are an AI assistant for a college application management platform called CAMP. You help college counselors manage student applications, track deadlines, and generate Letters of Recommendation.

You have access to the following tools:

Data Query Tools:
- get_students: Query students with filters (search, graduation year, progress)
- get_students_by_application_type: Query students by application type (ED=Early Decision, EA=Early Action, RD=Regular Decision, Rolling)
- get_student: Get detailed information about a specific student
- get_tasks: Query tasks with filters (status, priority, date range, student)
- get_task: Get detailed information about a specific task
- get_upcoming_deadlines: Get tasks with upcoming deadlines

Action Tools:
- update_student: Update student information (name, email, progress, GPA)
- add_student_note: Add a note to a student's record
- summarize_student: Generate an AI summary of a student's profile and progress
- compute_student_risk: Calculate a risk score for a student
- create_task: Create a new task
- update_task: Update an existing task
- schedule_task_reminder: Schedule reminders for a task
- save_insight: Save an AI-generated insight for later reference
- run_analysis: Run analysis modules (risk scoring, workload forecast, anomaly detection, cohort trends, task efficiency)

When users ask about students by application type (e.g., "students applying Early Decision"), use get_students_by_application_type with applicationType="ED" for Early Decision, "EA" for Early Action, "RD" for Regular Decision, or "Rolling" for Rolling admission.

When users ask about students, tasks, or deadlines, use the appropriate tools to fetch real data from the database. Then provide a helpful response based on the actual data.

When users request actions (e.g., "update student progress", "create a task", "calculate risk score"), use the appropriate action tools. After performing actions, confirm what was done and summarize the results.

Key guidelines:
- Always use tools when users ask about specific data (students, tasks, deadlines)
- Use action tools when users request changes or want to perform operations
- Provide clear, formatted responses with the actual data
- Be concise but thorough in your responses
- Format dates in a readable format (e.g., "January 15, 2025")
- If data is not found, acknowledge it politely
- When performing actions, explain what you're doing before executing

Always be helpful and professional.`;

async function sendSSEChunk(controller: ReadableStreamDefaultController, data: any) {
  const encoder = new TextEncoder();
  const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  controller.enqueue(chunk);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, message, stream } = chatMessageSchema.parse(body);

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          counselor_id: user.id,
          title: message.substring(0, 50),
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Failed to create conversation:", convError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }

      convId = newConv.id;
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: convId,
        role: "user",
        content: message,
      });

    if (userMsgError) {
      console.error("Failed to save user message:", userMsgError);
    }

    // Get conversation history (optimized: fetch only last N messages)
    const { data: limitedHistory, error: historyError } = await supabase
      .from("messages")
      .select("role, content, tool_calls, tool_call_id")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (historyError) {
      console.error("Failed to fetch history:", historyError);
    }

    // Reverse to get chronological order
    const orderedHistory = limitedHistory ? limitedHistory.reverse() : [];

    // Build messages for AI
    const aiMessages: AIMessage[] = orderedHistory.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      tool_calls: msg.tool_calls as AIToolCall[] | undefined,
      tool_call_id: msg.tool_call_id || undefined,
    }));

    // Add current user message
    aiMessages.push({
      role: "user",
      content: message,
    });

    if (stream) {
      // Streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullContent = "";
            let toolCalls: AIToolCall[] = [];

            // Stream AI response
            for await (const chunk of aiServiceManager.chatStream(aiMessages, {
              systemPrompt: SYSTEM_PROMPT,
              temperature: 0.7,
              maxTokens: 2000,
              tools: aiTools,
            })) {
              if (chunk.type === "token" && chunk.content) {
                fullContent += chunk.content;
                await sendSSEChunk(controller, {
                  type: "token",
                  content: chunk.content,
                });
              } else if (chunk.type === "tool_call" && chunk.toolCall) {
                toolCalls.push(chunk.toolCall);
                await sendSSEChunk(controller, {
                  type: "tool_call",
                  toolCall: chunk.toolCall,
                });
              } else if (chunk.type === "error") {
                await sendSSEChunk(controller, {
                  type: "error",
                  error: chunk.error,
                });
                controller.close();
                return;
              } else if (chunk.type === "done") {
                // Process tool calls if any
                if (toolCalls.length > 0) {
                  const toolMessages: AIMessage[] = [];
                  
                  for (const toolCall of toolCalls) {
                    try {
                      const toolResult = await executeTool(toolCall, user.id);
                      
                      toolMessages.push({
                        role: "assistant",
                        content: "",
                        tool_calls: [toolCall],
                      });
                      
                      toolMessages.push({
                        role: "tool",
                        content: JSON.stringify(toolResult.result),
                        tool_call_id: toolCall.id,
                      });
                    } catch (error) {
                      console.error(`Tool execution error for ${toolCall.name}:`, error);
                      toolMessages.push({
                        role: "tool",
                        content: JSON.stringify({
                          error: error instanceof Error ? error.message : "Unknown error",
                        }),
                        tool_call_id: toolCall.id,
                      });
                    }
                  }

                  // Get AI response with tool results
                  let toolResponseContent = "";
                  for await (const chunk of aiServiceManager.chatStream(
                    [...aiMessages, ...toolMessages],
                    {
                      systemPrompt: SYSTEM_PROMPT,
                      temperature: 0.7,
                      maxTokens: 2000,
                      tools: aiTools,
                    }
                  )) {
                    if (chunk.type === "token" && chunk.content) {
                      toolResponseContent += chunk.content;
                      await sendSSEChunk(controller, {
                        type: "token",
                        content: chunk.content,
                      });
                    } else if (chunk.type === "error") {
                      await sendSSEChunk(controller, {
                        type: "error",
                        error: chunk.error,
                      });
                    }
                  }

                  fullContent = toolResponseContent;
                }

                // Save AI response
                const { error: aiMsgError } = await supabase
                  .from("messages")
                  .insert({
                    conversation_id: convId,
                    role: "assistant",
                    content: fullContent,
                    tool_calls: toolCalls.length > 0 ? toolCalls : null,
                    metadata: {
                      model: "ai-service",
                    },
                  });

                if (aiMsgError) {
                  console.error("Failed to save AI message:", aiMsgError);
                }

                // Update conversation timestamp
                await supabase
                  .from("conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", convId);

                await sendSSEChunk(controller, {
                  type: "done",
                  conversationId: convId,
                });
                controller.close();
              }
            }
          } catch (error) {
            console.error("Streaming error:", error);
            await sendSSEChunk(controller, {
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Non-streaming response (for backward compatibility)
      const aiResponse = await aiServiceManager.chat(aiMessages, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 2000,
        tools: aiTools,
      });

      let finalContent = aiResponse.content;
      const toolMessages: AIMessage[] = [];

      // Handle tool calls
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        for (const toolCall of aiResponse.toolCalls) {
          try {
            const toolResult = await executeTool(toolCall, user.id);
            
            toolMessages.push({
              role: "assistant",
              content: aiResponse.content,
              tool_calls: [toolCall],
            });
            
            toolMessages.push({
              role: "tool",
              content: JSON.stringify(toolResult.result),
              tool_call_id: toolCall.id,
            });
          } catch (error) {
            console.error(`Tool execution error for ${toolCall.name}:`, error);
            toolMessages.push({
              role: "tool",
              content: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
              }),
              tool_call_id: toolCall.id,
            });
          }
        }

        // Get final response with tool results
        const finalResponse = await aiServiceManager.chat(
          [...aiMessages, ...toolMessages],
          {
            systemPrompt: SYSTEM_PROMPT,
            temperature: 0.7,
            maxTokens: 2000,
            tools: aiTools,
          }
        );
        finalContent = finalResponse.content;
      }

      // Save AI response
      const { error: aiMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          role: "assistant",
          content: finalContent,
          tool_calls: aiResponse.toolCalls || null,
          metadata: {
            model: aiResponse.model,
            usage: aiResponse.usage,
          },
        });

      if (aiMsgError) {
        console.error("Failed to save AI message:", aiMsgError);
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      return NextResponse.json({
        success: true,
        data: {
          conversationId: convId,
          message: finalContent,
          model: aiResponse.model,
        },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process chat message";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

