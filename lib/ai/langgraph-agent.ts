/**
 * Simplified LangGraph Autonomous Agent
 * Working implementation using LangChain's ReAct agent pattern with state management
 */

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { createLLM } from "./llm-factory";
import { langchainTools } from "./langchain-tools";
import { crudTools } from "./langchain-tools-crud";
import { analyticsTools } from "./analytics-tools";
import { enhancedTools } from "./enhanced-tools";
import { MemorySaver } from "@langchain/langgraph";
import { getPersistentCheckpointSaver } from "./persistent-checkpoint";
import {
  retryWithBackoff,
  isRetryableError,
  extractJSONFromText,
  classifyError,
  withErrorBoundary,
} from "./error-recovery";

/**
 * System prompt for the agent
 */
const AGENT_SYSTEM_PROMPT = `You are an autonomous AI agent for a college application management system. You help counselors manage students, tasks, and analyze data to provide actionable insights.

## Your Capabilities:

1. **Data Analysis**: Calculate statistics, identify trends, generate insights
2. **Information Retrieval**: Query students, tasks, deadlines
3. **Proactive Monitoring**: Monitor deadlines, assess risks, track progress
4. **Autonomous Actions**: You can analyze data without asking for confirmation

## Available Tools:

**Analytics Tools (Autonomous):**
- calculate_statistics: Compute aggregations (averages, counts, distributions)
- trend_analysis: Analyze patterns over time
- generate_insights: Extract actionable insights from data
- deadline_monitor: Proactively check upcoming deadlines

**Query Tools:**
- get_students, get_student: Retrieve student information
- get_tasks, get_task: Retrieve task information
- get_upcoming_deadlines: Check deadlines within timeframe

**Action Tools (Require confirmation - propose only):**
- create_student, update_student, delete_student
- create_task, update_task, delete_task
- add_college_to_student
- generate_letter_of_recommendation

## Instructions:

1. **Understand Intent**: Determine if the user wants analysis, queries, or actions
2. **Plan Multi-Step**: Break complex requests into steps
3. **Execute Autonomously**: Run analytics and queries without asking
4. **Propose Actions**: For CRUD operations, return proposals with confirmation messages
5. **Generate Insights**: Always extract insights from analysis results
6. **Be Proactive**: Suggest related analyses or actions that might be helpful

Always be concise but thorough. Focus on actionable information.`;

/**
 * Insight interface for structured insights
 */
export interface Insight {
  category: string;
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
}

/**
 * Tool result interface
 */
export interface ToolResult {
  toolName: string;
  result: string;
  success: boolean;
}

/**
 * Create the LangGraph agent with all tools
 */
export function createLangGraphAgent(usePersistent: boolean = true) {
  const llm = createLLM({
    temperature: 0.3, // Lower for more focused analytical responses
    maxTokens: 2000,
  });

  // Combine all tools including enhanced capabilities
  const allTools = [...langchainTools, ...crudTools, ...analyticsTools, ...enhancedTools];

  console.log(`[LangGraph Agent] Creating agent with ${allTools.length} tools`);

  // Use persistent checkpoint saver for cross-session memory
  // Falls back to in-memory if persistent fails
  let checkpointer;
  if (usePersistent) {
    try {
      checkpointer = getPersistentCheckpointSaver();
      console.log("[LangGraph Agent] Using persistent checkpoint storage");
    } catch (error) {
      console.warn("[LangGraph Agent] Failed to initialize persistent storage, using in-memory:", error);
      checkpointer = new MemorySaver();
    }
  } else {
    checkpointer = new MemorySaver();
  }

  // Configure agent with error handling
  return createReactAgent({
    llm,
    tools: allTools,
    checkpointSaver: checkpointer,
    messageModifier: AGENT_SYSTEM_PROMPT,
  });
}

/**
 * Run the LangGraph agent with a message
 */
export async function runLangGraphAgent(
  message: string,
  conversationHistory: BaseMessage[] = [],
  threadId: string = "default"
): Promise<{
  response: string;
  insights?: Insight[];
  toolResults?: ToolResult[];
  messages: BaseMessage[];
  partial?: boolean;
  error?: {
    code: string;
    retryable: boolean;
    message?: string;
    attemptNumber?: number;
  };
}> {
  try {
    console.log("[LangGraph Agent] Starting agent run...");

    const agent = createLangGraphAgent();

    // Prepare messages
    const messages = [
      ...conversationHistory,
      new HumanMessage(message),
    ];

    // Invoke the agent with config
    // The agent will automatically handle tool calls and return results
    let result;
    try {
      result = await agent.invoke(
        {
          messages,
        },
        {
          configurable: {
            thread_id: threadId,
          },
          recursionLimit: 15, // Reduced from 25 to prevent long tool chains
        }
      );
    } catch (invokeError: any) {
      // Classify error for better handling
      const errorContext = classifyError(invokeError);

      console.error("[LangGraph Agent] Agent invocation error:", {
        category: errorContext.category,
        severity: errorContext.severity,
        retryable: errorContext.retryable,
        message: invokeError.message,
        lc_error_code: invokeError?.lc_error_code,
      });

      // Handle tool validation errors from Azure OpenAI
      if (invokeError?.message?.includes("tool_call_id") || invokeError?.lc_error_code === "INVALID_TOOL_RESULTS") {
        console.warn("[LangGraph Agent] Tool validation error detected - attempting recovery");

        // Try to extract any partial results
        const partialResponse = invokeError?.metadata?.messages?.find((m: any) => m._getType() === "ai")?.content;

        if (partialResponse && typeof partialResponse === "string") {
          console.log("[LangGraph Agent] Found partial response before error");
          return {
            response: partialResponse,
            messages: [],
            partial: true,
          };
        }

        // If retryable and we have remaining attempts (detected from attemptNumber)
        const attemptNumber = invokeError?.attemptNumber || 0;
        if (errorContext.retryable && attemptNumber < 2) {
          console.log("[LangGraph Agent] Error is retryable, suggesting user retry");
          return {
            response: errorContext.userMessage + " If this continues, please try a simpler question.",
            messages: [],
            error: {
              code: "TOOL_VALIDATION_ERROR",
              retryable: true,
              attemptNumber,
            },
          };
        }

        // Return a graceful error response
        return {
          response: errorContext.userMessage,
          messages: [],
          error: {
            code: "TOOL_VALIDATION_ERROR",
            retryable: false,
            message: errorContext.technicalMessage,
          },
        };
      }

      // For checkpoint conflicts, suggest retrying
      if (invokeError?.message?.includes("checkpoint conflict") || invokeError?.message?.includes("lock")) {
        console.warn("[LangGraph Agent] Checkpoint conflict detected");
        return {
          response: "The system is processing another request. Please try again in a moment.",
          messages: [],
          error: {
            code: "CHECKPOINT_CONFLICT",
            retryable: true,
          },
        };
      }

      // Re-throw non-recoverable errors
      throw invokeError;
    }

    // Extract the response from messages
    // Find the last non-tool message (should be AI message with final response)
    let response = "";
    let lastAIMessage: any = null;
    let hasAIMessages = false;

    for (let i = result.messages.length - 1; i >= 0; i--) {
      const msg = result.messages[i];
      if (msg._getType() === "ai") {
        hasAIMessages = true;
        lastAIMessage = msg;
        response = typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
        break;
      }
    }

    if (!response) {
      if (!hasAIMessages) {
        console.warn("[LangGraph Agent] No AI messages found in response - possible tool execution failure");
        console.log("[LangGraph Agent] Message types:", result.messages.map(m => m._getType()).join(", "));

        // Check if there were tool messages without AI response
        const hasToolMessages = result.messages.some(m => m._getType() === "tool");
        if (hasToolMessages) {
          response = "The agent encountered an issue processing tool results. Please try again with a simpler query.";
        } else {
          response = "The agent completed but did not generate a response. Please try rephrasing your question.";
        }
      } else {
        response = "Agent completed but no response content generated";
      }
    }

    console.log("[LangGraph Agent] Agent run complete:", {
      responseLength: response.length,
      hasAIMessages,
      totalMessages: result.messages.length,
      messageTypes: result.messages.map(m => m._getType()),
    });

    // Extract tool results if any
    const toolResults: ToolResult[] = [];
    for (const msg of result.messages) {
      if (msg._getType() === "ai" && "tool_calls" in msg && msg.tool_calls && Array.isArray(msg.tool_calls)) {
        for (const toolCall of msg.tool_calls) {
          toolResults.push({
            toolName: toolCall.name || "unknown",
            result: JSON.stringify(toolCall.args),
            success: true,
          });
        }
      }
    }

    console.log("[LangGraph Agent] Tool results found:", toolResults.length);

    // Try to extract insights from tool results using robust parsing
    let insights: Insight[] | undefined;
    const analyticsToolUsed = toolResults.some((r) =>
      ["calculate_statistics", "trend_analysis", "deadline_monitor", "generate_insights"].includes(r.toolName)
    );

    if (analyticsToolUsed) {
      // Use robust JSON extraction with multiple strategies
      const extracted = extractJSONFromText(response, "insights");

      if (extracted && Array.isArray(extracted)) {
        insights = extracted;
        console.log("[LangGraph Agent] Successfully extracted insights:", insights.length);
      } else if (extracted) {
        // Try to wrap single insight in array
        insights = [extracted];
        console.log("[LangGraph Agent] Wrapped single insight in array");
      } else {
        console.warn("[LangGraph Agent] Failed to extract insights from response despite analytics tool usage");
        console.log("[LangGraph Agent] Response preview:", response.substring(0, 200));
      }
    }

    return {
      response,
      insights,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      messages: result.messages,
    };
  } catch (error) {
    console.error("[LangGraph Agent] Error running agent:", error);
    // Don't re-throw, return error response instead
    return {
      response: `Agent error: ${error instanceof Error ? error.message : "Unknown error"}`,
      messages: [],
    };
  }
}

/**
 * Stream the LangGraph agent for real-time responses
 */
export async function* streamLangGraphAgent(
  message: string,
  conversationHistory: BaseMessage[] = [],
  threadId: string = "default"
): AsyncGenerator<{
  type: "token" | "tool" | "insight" | "complete" | "error";
  content: any;
}> {
  try {
    console.log("[LangGraph Agent] Starting streaming agent run...");

    const agent = createLangGraphAgent();

    // Prepare messages
    const messages = [
      ...conversationHistory,
      new HumanMessage(message),
    ];

    // Stream the agent
    let stream;
    try {
      stream = await agent.stream(
        {
          messages,
        },
        {
          configurable: {
            thread_id: threadId,
          },
          streamMode: "values",
          recursionLimit: 15, // Match non-streaming version
        }
      );
    } catch (streamError: any) {
      // Handle initialization errors (like checkpoint conflicts)
      console.error("[LangGraph Agent] Error initializing stream:", streamError);

      // Return graceful error
      yield {
        type: "error",
        content: {
          message: "Unable to start agent. This may be due to a checkpoint conflict. Please try again.",
          retryable: true,
        },
      };
      return;
    }

    let fullResponse = "";
    const toolResults: ToolResult[] = [];

    try {
      const seenToolCalls = new Set<string>(); // Track which tools we've already reported

      for await (const event of stream) {
        // Stream messages
        if (event.messages && event.messages.length > 0) {
          const lastMessage = event.messages[event.messages.length - 1];

          // Detect tool calls from AI messages (before execution)
          if (lastMessage._getType() === "ai") {
            const content = typeof lastMessage.content === "string"
              ? lastMessage.content
              : JSON.stringify(lastMessage.content);

            if (content !== fullResponse) {
              const newTokens = content.slice(fullResponse.length);
              fullResponse = content;

              yield {
                type: "token",
                content: newTokens,
              };
            }

            // Report tool calls as they are planned
            if ("tool_calls" in lastMessage && lastMessage.tool_calls && Array.isArray(lastMessage.tool_calls)) {
              for (const toolCall of lastMessage.tool_calls) {
                const toolKey = `${toolCall.name}-${toolCall.id || JSON.stringify(toolCall.args)}`;

                // Only report each tool call once
                if (!seenToolCalls.has(toolKey)) {
                  seenToolCalls.add(toolKey);

                  const toolResult: ToolResult = {
                    toolName: toolCall.name || "unknown",
                    result: JSON.stringify(toolCall.args),
                    success: true,
                  };
                  toolResults.push(toolResult);

                  console.log(`[LangGraph Agent] Streaming tool call: ${toolCall.name}`);

                  yield {
                    type: "tool",
                    content: {
                      toolName: toolCall.name || "unknown",
                      args: toolCall.args,
                    },
                  };
                }
              }
            }
          }

          // Also detect tool execution from ToolMessage events
          if (lastMessage._getType() === "tool") {
            const toolName = (lastMessage as any).name || "unknown";
            const toolKey = `${toolName}-executed`;

            // Report tool execution if we haven't seen it yet
            if (!seenToolCalls.has(toolKey)) {
              seenToolCalls.add(toolKey);

              console.log(`[LangGraph Agent] Tool executed: ${toolName}`);

              // We don't yield here to avoid duplicate reporting
              // The tool_calls from AI message already reported it
            }
          }
        }
      }
    } catch (iterationError: any) {
      // Classify the error for better handling
      const errorContext = classifyError(iterationError);

      console.error("[LangGraph Agent] Error during stream iteration:", {
        category: errorContext.category,
        severity: errorContext.severity,
        retryable: errorContext.retryable,
        message: iterationError.message,
      });

      // If we got a partial response, return it
      if (fullResponse) {
        console.log("[LangGraph Agent] Returning partial response before error:", {
          responseLength: fullResponse.length,
          toolsUsed: toolResults.length,
        });
        yield {
          type: "complete",
          content: {
            response: fullResponse,
            toolResults: toolResults.length > 0 ? toolResults : undefined,
            partial: true,
            error: {
              code: errorContext.category.toUpperCase(),
              message: errorContext.userMessage,
              retryable: errorContext.retryable,
            },
          },
        };
      } else {
        // No response yet, return error with context
        console.warn("[LangGraph Agent] Stream failed with no partial response");
        yield {
          type: "error",
          content: {
            message: errorContext.userMessage,
            retryable: errorContext.retryable,
            severity: errorContext.severity,
            code: errorContext.category.toUpperCase(),
          },
        };
      }
      return;
    }

    // Yield completion
    yield {
      type: "complete",
      content: {
        response: fullResponse || "Agent completed but no response generated",
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      },
    };

    console.log("[LangGraph Agent] Streaming agent run complete");
  } catch (error) {
    console.error("[LangGraph Agent] Error streaming agent:", error);

    // Yield error instead of throwing
    yield {
      type: "error",
      content: {
        message: error instanceof Error ? error.message : "Unknown error occurred",
        retryable: true,
      },
    };
  }
}
