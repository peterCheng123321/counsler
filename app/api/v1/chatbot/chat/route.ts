import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runLangChainAgent } from "@/lib/ai/langchain-agent";
import { streamLangGraphAgent, runLangGraphAgent } from "@/lib/ai/langgraph-agent";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";
import { responseCache } from "@/lib/ai/response-cache";
import { requestQueue } from "@/lib/ai/request-queue";

const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  stream: z.boolean().optional().default(false),
  agentMode: z.enum(["langchain", "langgraph"]).optional().default("langgraph"), // Default to new LangGraph agent
  studentContext: z.object({
    id: z.string(),
    name: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    graduationYear: z.number().optional(),
    gpa: z.number().nullable().optional(),
    sat: z.number().nullable().optional(),
    act: z.number().nullable().optional(),
    progress: z.number().nullable().optional(),
  }).optional(),
});

/**
 * Sanitize user input to prevent prompt injection and other attacks
 */
function sanitizeMessage(message: string): string {
  // Trim whitespace
  let sanitized = message.trim();

  // Remove any HTML/script tags
  sanitized = sanitized.replace(/<[^>]*>/g, "");

  // Detect common prompt injection patterns
  const suspiciousPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions?/i,
    /ignore\s+(all\s+)?above/i,
    /disregard\s+(all\s+)?previous\s+instructions?/i,
    /forget\s+(all\s+)?previous\s+instructions?/i,
    /<\/?system>/i,
    /<\/?assistant>/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error("Invalid input detected");
    }
  }

  return sanitized;
}

const HISTORY_LIMIT = 10; // Limit conversation history to last 10 messages

async function sendSSEChunk(controller: ReadableStreamDefaultController, data: any) {
  try {
    const encoder = new TextEncoder();
    const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
    controller.enqueue(chunk);

    // Add small delay to prevent overwhelming the client
    // But keep it fast for perceived responsiveness
    await new Promise(resolve => setTimeout(resolve, 1));
  } catch (error) {
    console.error("Error sending SSE chunk:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const { conversationId, message: rawMessage, stream, agentMode, studentContext } = chatMessageSchema.parse(body);

    // Sanitize the message to prevent injection attacks
    let message = sanitizeMessage(rawMessage);

    // If we have student context, enhance the message with structured context
    if (studentContext) {
      // Create a context-enhanced message that the AI will understand better
      const contextPrefix = `[Context: You are helping a counselor who is currently viewing ${studentContext.name}'s profile. ` +
        `Student details - GPA: ${studentContext.gpa || 'Not provided'}, ` +
        `SAT: ${studentContext.sat || 'Not provided'}, ` +
        `ACT: ${studentContext.act || 'Not provided'}, ` +
        `Graduation Year: ${studentContext.graduationYear || 'Not provided'}, ` +
        `Progress: ${studentContext.progress || 0}%. ` +
        `All questions refer to this specific student unless stated otherwise.]\n\n` +
        `Question about ${studentContext.name}: ${message}`;

      message = contextPrefix;
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          counselor_id: userId,
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

    // Get conversation history (limited to last N messages)
    const { data: allHistory } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    // Limit history to last N messages
    const limitedHistory = allHistory ? allHistory.slice(-HISTORY_LIMIT) : [];

    // Build messages for LangChain agent
    const messages = [
      ...limitedHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    if (stream) {
      // Streaming response with SSE
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            let fullContent = "";
            let toolsUsed = false;
            let insights: any[] = [];
            let toolResults: any[] = [];

            if (agentMode === "langgraph") {
              console.log("Running LangGraph agent with streaming...");

              // Convert messages to BaseMessage format for LangGraph
              const { HumanMessage, AIMessage } = await import("@langchain/core/messages");
              const baseMessages = messages.map((msg) => {
                if (msg.role === "user") {
                  return new HumanMessage(msg.content);
                } else {
                  return new AIMessage(msg.content);
                }
              });

              // Stream the LangGraph agent
              const streamGen = streamLangGraphAgent(
                message,
                baseMessages.slice(0, -1), // Exclude the last message (current user message)
                convId
              );

              for await (const event of streamGen) {
                switch (event.type) {
                  case "token":
                    fullContent += event.content;
                    await sendSSEChunk(controller, {
                      type: "token",
                      content: event.content,
                    });
                    break;

                  case "tool":
                    toolsUsed = true;
                    console.log(`[Chat API] Tool call received: ${event.content.toolName}`);
                    // Store full tool result for later
                    toolResults.push({
                      toolName: event.content.toolName,
                      result: JSON.stringify(event.content.args),
                      success: true,
                    });
                    // Stream tool call to frontend with arguments
                    await sendSSEChunk(controller, {
                      type: "tool_call",
                      toolCall: {
                        name: event.content.toolName,
                        args: event.content.args,
                        id: "langgraph-tool",
                      },
                    });
                    console.log(`[Chat API] Tool call sent to frontend: ${event.content.toolName}`);
                    break;

                  case "insight":
                    insights.push(event.content);
                    await sendSSEChunk(controller, {
                      type: "insight",
                      insight: event.content,
                    });
                    break;

                  case "complete":
                    if (!fullContent && event.content.response) {
                      fullContent = event.content.response;
                    }
                    if (event.content.toolResults) {
                      toolResults = event.content.toolResults;
                      toolsUsed = toolResults.length > 0;
                    }
                    break;
                }
              }

              // Save assistant response with insights
              const [{ error: aiMsgError }] = await Promise.all([
                supabase.from("messages").insert({
                  conversation_id: convId,
                  role: "assistant",
                  content: fullContent,
                  metadata: {
                    model: "langgraph-agent",
                    toolsUsed,
                    toolResults: toolResults.length,
                    insights: insights.length,
                    insightsData: insights,
                  },
                }),
                supabase
                  .from("conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", convId),
              ]);

              if (aiMsgError) {
                console.error("Error saving AI message:", aiMsgError);
              }
            } else {
              // Original LangChain agent logic
              console.log("Running LangChain agent with streaming...");

              const result = await runLangChainAgent(messages, {
                temperature: 0.7,
                maxTokens: 2000,
                streaming: true,
                onToken: async (token) => {
                  fullContent += token;
                  await sendSSEChunk(controller, {
                    type: "token",
                    content: token,
                  });
                },
                onToolCall: async (toolName) => {
                  toolsUsed = true;
                  await sendSSEChunk(controller, {
                    type: "tool_call",
                    toolCall: {
                      name: toolName,
                      id: "langchain-tool",
                    },
                  });
                },
              });

              if (!fullContent && result.content) {
                fullContent = result.content;
                await sendSSEChunk(controller, {
                  type: "token",
                  content: fullContent,
                });
              }

              if (result.intermediateSteps && result.intermediateSteps.length > 0) {
                toolsUsed = true;
              }

              const [{ error: aiMsgError }] = await Promise.all([
                supabase.from("messages").insert({
                  conversation_id: convId,
                  role: "assistant",
                  content: fullContent,
                  metadata: {
                    model: "langchain-agent",
                    toolsUsed,
                    intermediateSteps: result.intermediateSteps?.length || 0,
                  },
                }),
                supabase
                  .from("conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", convId),
              ]);

              if (aiMsgError) {
                console.error("Error saving AI message:", aiMsgError);
              }
            }

            await sendSSEChunk(controller, {
              type: "done",
              conversationId: convId,
            });

            controller.close();
          } catch (error) {
            console.error("Agent error:", error);
            await sendSSEChunk(controller, {
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            });
            controller.close();
          }
        },
      });

      return new Response(responseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Non-streaming response

      // Check cache first
      const cachedResponse = responseCache.get(message, convId);
      if (cachedResponse) {
        console.log("[Chat API] Returning cached response");

        // Save cached response to history
        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: cachedResponse,
          metadata: {
            cached: true,
            model: agentMode === "langgraph" ? "langgraph-agent" : "langchain-agent",
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            conversationId: convId,
            message: cachedResponse,
            cached: true,
            model: agentMode === "langgraph" ? "langgraph-agent" : "langchain-agent",
          },
        });
      }

      // Queue the request to prevent overwhelming backend
      const result = await requestQueue.enqueue(async () => {
        let finalContent = "";
        let metadata: any = {};

        if (agentMode === "langgraph") {
          console.log("Running LangGraph agent (non-streaming)...");

          // Convert messages to BaseMessage format
          const { HumanMessage, AIMessage } = await import("@langchain/core/messages");
          const baseMessages = messages.map((msg) => {
            if (msg.role === "user") {
              return new HumanMessage(msg.content);
            } else {
              return new AIMessage(msg.content);
            }
          });

          const result = await runLangGraphAgent(
            message,
            baseMessages.slice(0, -1),
            convId
          );

          finalContent = result.response;
          metadata = {
            model: "langgraph-agent",
            toolsUsed: result.toolResults && result.toolResults.length > 0,
            toolResults: result.toolResults?.length || 0,
            insights: result.insights?.length || 0,
            insightsData: result.insights,
          };
        } else {
          console.log("Running LangChain agent (non-streaming)...");

          const result = await runLangChainAgent(messages, {
            temperature: 0.7,
            maxTokens: 2000,
          });

          finalContent = result.content;
          metadata = {
            model: "langchain-agent",
            toolsUsed: result.intermediateSteps && result.intermediateSteps.length > 0,
            intermediateSteps: result.intermediateSteps?.length || 0,
          };
        }

        return { finalContent, metadata };
      });

      const { finalContent, metadata } = result;

      // Save assistant response and update conversation timestamp in parallel
      const [{ error: aiMsgError }] = await Promise.all([
        supabase.from("messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: finalContent,
          metadata,
        }),
        supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId),
      ]);

      if (aiMsgError) {
        console.error("Error saving AI message:", aiMsgError);
        return NextResponse.json(
          { error: "Failed to save AI response", details: aiMsgError.message },
          { status: 500 }
        );
      }

      // Cache the response for future requests
      responseCache.set(message, finalContent, convId);

      return NextResponse.json({
        success: true,
        data: {
          conversationId: convId,
          message: finalContent,
          insights: metadata.insightsData,
          model: metadata.model,
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

    console.error("Chat route error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process chat message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
