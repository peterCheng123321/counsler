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
export function createLangGraphAgent() {
  const llm = createLLM({
    temperature: 0.3, // Lower for more focused analytical responses
    maxTokens: 2000,
  });

  // Combine all tools including enhanced capabilities
  const allTools = [...langchainTools, ...crudTools, ...analyticsTools, ...enhancedTools];

  console.log(`[LangGraph Agent] Creating agent with ${allTools.length} tools`);

  // Create ReAct agent with memory
  const checkpointer = new MemorySaver();

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
    const result = await agent.invoke(
      {
        messages,
      },
      {
        configurable: {
          thread_id: threadId,
        },
      }
    );

    // Extract the response from messages
    const lastMessage = result.messages[result.messages.length - 1];
    const response = typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

    console.log("[LangGraph Agent] Agent run complete");

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

    // Try to extract insights from tool results
    let insights: Insight[] | undefined;
    const analyticsToolUsed = toolResults.some((r) =>
      ["calculate_statistics", "trend_analysis", "deadline_monitor"].includes(r.toolName)
    );

    if (analyticsToolUsed) {
      // Look for insights in the response or tool results
      try {
        const insightsMatch = response.match(/insights?:\s*(\[[\s\S]*?\])/i);
        if (insightsMatch) {
          insights = JSON.parse(insightsMatch[1]);
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
    throw error;
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
  type: "token" | "tool" | "insight" | "complete";
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
    const stream = await agent.stream(
      {
        messages,
      },
      {
        configurable: {
          thread_id: threadId,
        },
        streamMode: "values",
      }
    );

    let fullResponse = "";
    const toolResults: ToolResult[] = [];

    for await (const event of stream) {
      // Stream messages
      if (event.messages && event.messages.length > 0) {
        const lastMessage = event.messages[event.messages.length - 1];

        // Stream AI message content
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

          // Report tool calls
          if ("tool_calls" in lastMessage && lastMessage.tool_calls && Array.isArray(lastMessage.tool_calls)) {
            for (const toolCall of lastMessage.tool_calls) {
              const toolResult: ToolResult = {
                toolName: toolCall.name || "unknown",
                result: JSON.stringify(toolCall.args),
                success: true,
              };
              toolResults.push(toolResult);

              yield {
                type: "tool",
                content: toolResult,
              };
            }
          }
        }
      }
    }

    // Yield completion
    yield {
      type: "complete",
      content: {
        response: fullResponse,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      },
    };

    console.log("[LangGraph Agent] Streaming agent run complete");
  } catch (error) {
    console.error("[LangGraph Agent] Error streaming agent:", error);
    throw error;
  }
}
