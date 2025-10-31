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
      // Handle tool validation errors from Azure OpenAI
      if (invokeError?.message?.includes("tool_call_id") || invokeError?.lc_error_code === "INVALID_TOOL_RESULTS") {
        console.error("[LangGraph Agent] Tool validation error:", {
          message: invokeError.message,
          lc_error_code: invokeError?.lc_error_code,
          pregelTaskId: invokeError?.pregelTaskId,
          attemptNumber: invokeError?.attemptNumber,
          stack: invokeError.stack?.split('\n').slice(0, 3).join('\n'),
        });

        // Try to extract any partial results
        const partialResponse = invokeError?.metadata?.messages?.find((m: any) => m._getType() === "ai")?.content;

        if (partialResponse && typeof partialResponse === "string") {
          console.log("[LangGraph Agent] Found partial response before error");
          return {
            response: partialResponse,
            messages: [],
          };
        }

        // Return a graceful error response
        return {
          response: "I encountered an issue while processing your request. The database query tools may have had an error. Please try again or try a simpler query.",
          messages: [],
        };
      }
      // Re-throw other errors
      throw invokeError;
    }

    // Extract the response from messages
    // Find the last non-tool message (should be AI message with final response)
    let response = "";
    let lastAIMessage: any = null;
    
    for (let i = result.messages.length - 1; i >= 0; i--) {
      const msg = result.messages[i];
      if (msg._getType() === "ai") {
        lastAIMessage = msg;
        response = typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
        break;
      }
    }

    if (!response) {
      response = "Agent completed but no response generated";
    }

    console.log("[LangGraph Agent] Agent run complete, response length:", response.length);

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

    // Try to extract insights from tool results
    let insights: Insight[] | undefined;
    const analyticsToolUsed = toolResults.some((r) =>
      ["calculate_statistics", "trend_analysis", "deadline_monitor", "generate_insights"].includes(r.toolName)
    );

    if (analyticsToolUsed) {
      // Look for insights in the response or tool results
      try {
        const insightsMatch = response.match(/insights?:\s*(\[[\s\S]*?\])/i);
        if (insightsMatch) {
          insights = JSON.parse(insightsMatch[1]);
          if (insights && Array.isArray(insights)) {
            console.log("[LangGraph Agent] Extracted insights:", insights.length);
          }
        }
      } catch (error) {
        console.error("[LangGraph Agent] Failed to parse insights:", error);
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
      // Handle errors during stream iteration
      console.error("[LangGraph Agent] Error during stream iteration:", iterationError);

      // If we got a partial response, return it
      if (fullResponse) {
        console.log("[LangGraph Agent] Returning partial response before error");
        yield {
          type: "complete",
          content: {
            response: fullResponse,
            toolResults: toolResults.length > 0 ? toolResults : undefined,
            partial: true,
          },
        };
      } else {
        // No response yet, return error
        yield {
          type: "error",
          content: {
            message: "Agent encountered an error during execution. Please try again.",
            retryable: true,
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
