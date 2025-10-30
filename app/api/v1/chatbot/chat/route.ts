import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runLangChainAgent } from "@/lib/ai/langchain-agent";
import { z } from "zod";
import { DEMO_USER_ID } from "@/lib/constants";

const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  stream: z.boolean().optional().default(false), // LangChain streaming works differently
});

const HISTORY_LIMIT = 10; // Limit conversation history to last 10 messages

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
    const supabase = createAdminClient();
    const userId = DEMO_USER_ID;

    const body = await request.json();
    const { conversationId, message, stream } = chatMessageSchema.parse(body);

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

            console.log("Running LangChain agent with streaming...");

            const result = await runLangChainAgent(messages, {
              temperature: 0.7,
              maxTokens: 2000,
              streaming: true,
              onToken: async (token) => {
                // Stream tokens as they arrive from OpenAI
                fullContent += token;
                await sendSSEChunk(controller, {
                  type: "token",
                  content: token,
                });
              },
              onToolCall: async (toolName) => {
                toolsUsed = true;
                // Send tool call notification
                await sendSSEChunk(controller, {
                  type: "tool_call",
                  toolCall: {
                    name: toolName,
                    id: "langchain-tool",
                  },
                });
              },
            });

            // Use result content if streaming didn't populate fullContent
            if (!fullContent && result.content) {
              fullContent = result.content;

              // Send the content if not streamed
              await sendSSEChunk(controller, {
                type: "token",
                content: fullContent,
              });
            }

            // Check if tools were used
            if (result.intermediateSteps && result.intermediateSteps.length > 0) {
              toolsUsed = true;
            }

            // Save assistant response and update conversation timestamp in parallel
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

            await sendSSEChunk(controller, {
              type: "done",
              conversationId: convId,
            });

            controller.close();
          } catch (error) {
            console.error("LangChain agent error:", error);
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
      console.log("Running LangChain agent (non-streaming)...");

      const result = await runLangChainAgent(messages, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      const finalContent = result.content;

      // Save assistant response and update conversation timestamp in parallel
      const [{ error: aiMsgError }] = await Promise.all([
        supabase.from("messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: finalContent,
          metadata: {
            model: "langchain-agent",
            toolsUsed: result.intermediateSteps && result.intermediateSteps.length > 0,
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
        return NextResponse.json(
          { error: "Failed to save AI response", details: aiMsgError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          conversationId: convId,
          message: finalContent,
          model: "langchain-agent",
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
