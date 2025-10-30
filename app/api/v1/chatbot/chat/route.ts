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
  try {
    const encoder = new TextEncoder();
    const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
    controller.enqueue(chunk);
  } catch (error) {
    console.error("Error sending SSE chunk:", error);
  }
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
      console.error("Error saving user message:", userMsgError);
      return NextResponse.json(
        { error: "Failed to save user message", details: userMsgError.message },
        { status: 500 }
      );
    }

    // Get conversation history (optimized: fetch only last N messages)
    const { data: fetchedHistory, error: historyError } = await supabase
      .from("messages")
      .select("role, content, tool_calls, tool_call_id")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (historyError) {
      console.error("Failed to fetch history:", historyError);
    }

    // Reverse to get chronological order
    const limitedHistory = fetchedHistory ? fetchedHistory.reverse() : [];

    // Build messages for AI, ensuring tool messages are properly paired
    const aiMessages: AIMessage[] = [];

    for (let i = 0; i < limitedHistory.length; i++) {
      const msg = limitedHistory[i];

      // Handle assistant messages with tool_calls
      if (msg.role === "assistant" && msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        // Collect all tool_call_ids we need responses for
        const toolCallIds = msg.tool_calls.map((tc: any) => tc.id).filter(Boolean);
        
        // Look ahead to find all tool responses
        const remainingMessages = limitedHistory.slice(i + 1);
        const foundToolResponses: any[] = [];
        
        for (const toolCallId of toolCallIds) {
          const toolMsg = remainingMessages.find((m) => m.role === "tool" && m.tool_call_id === toolCallId);
          if (toolMsg) {
            foundToolResponses.push(toolMsg);
          }
        }
        
        // Only include this assistant message if ALL tool responses are found
        if (foundToolResponses.length === toolCallIds.length) {
          // Add assistant message with tool_calls
          aiMessages.push({
            role: "assistant",
            content: msg.content,
            tool_calls: msg.tool_calls as AIToolCall[],
          });
          
          // Add all tool response messages in order
          for (const toolMsg of foundToolResponses) {
            aiMessages.push({
              role: "tool",
              content: toolMsg.content,
              tool_call_id: toolMsg.tool_call_id,
            });
          }
          
          // Skip the tool messages we just added
          i += foundToolResponses.length;
        } else {
          // Not all tool responses found - skip this assistant message entirely
          // or add it without tool_calls to avoid errors
          console.warn(`Skipping assistant message with incomplete tool responses. Found ${foundToolResponses.length}/${toolCallIds.length} responses.`);
          // Skip it entirely to avoid errors
        }
        continue;
      }
      
      // Handle tool messages - skip them here as they're handled above
      if (msg.role === "tool") {
        continue;
      }
      
      // Include user, assistant (without tool_calls), and system messages
      if (msg.role === "user" || msg.role === "system" || (msg.role === "assistant" && (!msg.tool_calls || msg.tool_calls.length === 0))) {
        aiMessages.push({
          role: msg.role,
          content: msg.content,
          tool_calls: undefined,
          tool_call_id: undefined,
        });
      }
    }

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
                // Send tool_call event to frontend for UI state, not as content
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
                  // Only save assistant message with tool_calls if there's content
                  // Some AI models send tool calls without initial content
                  if (fullContent.trim()) {
                    const { error: assistantMsgError } = await supabase
                      .from("messages")
                      .insert({
                        conversation_id: convId,
                        role: "assistant",
                        content: fullContent,
                        tool_calls: toolCalls,
                      });

                    if (assistantMsgError) {
                      console.error("Error saving assistant message with tool_calls:", assistantMsgError);
                    }
                  }

                  const toolMessages: AIMessage[] = [];
                  
                  for (const toolCall of toolCalls) {
                    try {
                      const toolResult = await executeTool(toolCall, user.id);
                      
                      // Save tool response message
                      const { error: toolMsgError } = await supabase
                        .from("messages")
                        .insert({
                          conversation_id: convId,
                          role: "tool",
                          content: JSON.stringify(toolResult.result),
                          tool_call_id: toolCall.id,
                        });

                      if (toolMsgError) {
                        console.error("Error saving tool message:", toolMsgError);
                      }
                      
                      toolMessages.push({
                        role: "assistant",
                        content: fullContent || "",
                        tool_calls: [toolCall],
                      });
                      
                      toolMessages.push({
                        role: "tool",
                        content: JSON.stringify(toolResult.result),
                        tool_call_id: toolCall.id,
                      });
                    } catch (error) {
                      console.error("Tool execution error:", error);
                      // Save error tool response
                      const { error: toolMsgError } = await supabase
                        .from("messages")
                        .insert({
                          conversation_id: convId,
                          role: "tool",
                          content: JSON.stringify({
                            error: error instanceof Error ? error.message : "Unknown error",
                          }),
                          tool_call_id: toolCall.id,
                        });

                      if (toolMsgError) {
                        console.error("Error saving tool error message:", toolMsgError);
                      }

                      toolMessages.push({
                        role: "assistant",
                        content: fullContent || "",
                        tool_calls: [toolCall],
                      });
                      
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
                  
                  // Don't send placeholder text - frontend will handle loading state
                  
                  let toolStreamCompleted = false;
                  for await (const toolChunk of aiServiceManager.chatStream(
                    [...aiMessages, ...toolMessages],
                    {
                      systemPrompt: SYSTEM_PROMPT,
                      temperature: 0.7,
                      maxTokens: 2000,
                      tools: aiTools,
                    }
                  )) {
                    if (toolChunk.type === "token" && toolChunk.content) {
                      toolResponseContent += toolChunk.content;
                      await sendSSEChunk(controller, {
                        type: "token",
                        content: toolChunk.content,
                      });
                    } else if (toolChunk.type === "error") {
                      await sendSSEChunk(controller, {
                        type: "error",
                        error: toolChunk.error,
                      });
                      controller.close();
                      return;
                    } else if (toolChunk.type === "done") {
                      // Tool response stream is complete
                      toolStreamCompleted = true;
                      break;
                    }
                  }

                  // If stream ended without "done" event, we still use the content we got
                  if (!toolStreamCompleted && toolResponseContent.trim()) {
                    console.log("Tool response stream completed naturally");
                  }

                  // Only send fallback if absolutely no content was received
                  if (!toolResponseContent.trim()) {
                    console.warn("Tool response stream returned empty content. Tool results:", toolMessages.map(m => m.content));
                    // Don't send placeholder - let the AI model handle this
                  }

                  // Save final response after tool processing
                  fullContent = toolResponseContent;
                  
                  if (fullContent.trim()) {
                    const { error: aiMsgError } = await supabase
                      .from("messages")
                      .insert({
                        conversation_id: convId,
                        role: "assistant",
                        content: fullContent,
                        tool_calls: null,
                        metadata: {
                          model: "ai-service",
                          usage: { tokens: 0 },
                        },
                      });

                    if (aiMsgError) {
                      console.error("Error saving final AI message (streaming):", aiMsgError);
                    }
                  }
                } else {
                  // No tool calls - save the regular response
                  if (fullContent.trim()) {
                    const { error: aiMsgError } = await supabase
                      .from("messages")
                      .insert({
                        conversation_id: convId,
                        role: "assistant",
                        content: fullContent,
                        tool_calls: null,
                        metadata: {
                          model: "ai-service",
                          usage: { tokens: 0 },
                        },
                      });

                    if (aiMsgError) {
                      console.error("Error saving AI message (streaming):", aiMsgError);
                    }
                  }
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
                return;
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
        // Save assistant message with tool_calls first
        const { error: assistantMsgError } = await supabase
          .from("messages")
          .insert({
            conversation_id: convId,
            role: "assistant",
            content: aiResponse.content || "",
            tool_calls: aiResponse.toolCalls,
          });

        if (assistantMsgError) {
          console.error("Error saving assistant message with tool_calls:", assistantMsgError);
        }

        for (const toolCall of aiResponse.toolCalls) {
          try {
            const toolResult = await executeTool(toolCall, user.id);
            
            // Save tool response message
            const { error: toolMsgError } = await supabase
              .from("messages")
              .insert({
                conversation_id: convId,
                role: "tool",
                content: JSON.stringify(toolResult.result),
                tool_call_id: toolCall.id,
              });

            if (toolMsgError) {
              console.error("Error saving tool message:", toolMsgError);
            }

            toolMessages.push({
              role: "assistant",
              content: aiResponse.content || "",
              tool_calls: [toolCall],
            });
            
            toolMessages.push({
              role: "tool",
              content: JSON.stringify(toolResult.result),
              tool_call_id: toolCall.id,
            });
          } catch (error) {
            // Save error tool response
            const { error: toolMsgError } = await supabase
              .from("messages")
              .insert({
                conversation_id: convId,
                role: "tool",
                content: JSON.stringify({
                  error: error instanceof Error ? error.message : "Unknown error",
                }),
                tool_call_id: toolCall.id,
              });

            if (toolMsgError) {
              console.error("Error saving tool error message:", toolMsgError);
            }

            toolMessages.push({
              role: "assistant",
              content: aiResponse.content || "",
              tool_calls: [toolCall],
            });
            
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

      // Save final AI response
      const { error: aiMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          role: "assistant",
          content: finalContent,
          tool_calls: null,
          metadata: {
            model: aiResponse.model,
            usage: aiResponse.usage,
          },
        });

      if (aiMsgError) {
        console.error("Error saving AI message:", aiMsgError);
        return NextResponse.json(
          { error: "Failed to save AI response", details: aiMsgError.message },
          { status: 500 }
        );
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

    const errorMessage = error instanceof Error ? error.message : "Failed to process chat message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


