/**
 * LangChain Agent Implementation
 * Provides AI agent with tool calling support for all AI providers
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { langchainTools } from "./langchain-tools";
import { crudTools } from "./langchain-tools-crud";
import { enhancedTools } from "./enhanced-tools";
import { createLLM, getActiveProviderInfo, type AIProvider, type LLMConfig } from "./llm-factory";

const SYSTEM_PROMPT = `AI assistant for college application management (CAMP). Help counselors manage students, tasks, and deadlines.

**READ TOOLS** (Query):
- get_students/get_student: Query/get student info (BY ID ONLY)
- get_tasks/get_task: Query/get tasks, deadlines, events
- get_upcoming_deadlines: Check upcoming deadlines

**WRITE TOOLS** (Propose with confirmation):
- create/update/delete_student: Propose student changes
- create/update/delete_task: Propose task/event changes
- add_college_to_student: Propose adding college
- generate_letter_of_recommendation: Propose letter

**CRITICAL Rules**:
1. Write tools require confirmation - propose clearly
2. For student names: search with get_students first, then get by ID
3. Tasks include ALL events: interviews, visits, tests, deadlines
4. ALWAYS search before saying data doesn't exist
5. Use markdown formatting, readable dates

**Workflow**:
- Query requests → Use tools directly
- Write requests → Propose with confirmation
- Student by name → Search first, get by ID second
- Be proactive, suggest related actions`;

export interface LangChainAgentConfig extends LLMConfig {
  onToken?: (token: string) => void;
  onToolCall?: (toolName: string) => void;
}

/**
 * Convert custom message format to LangChain messages
 */
function convertToLangChainMessages(
  messages: Array<{
    role: string;
    content: string;
  }>
): BaseMessage[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case "system":
        return new SystemMessage(msg.content);
      case "user":
        return new HumanMessage(msg.content);
      case "assistant":
        return new AIMessage(msg.content);
      default:
        return new HumanMessage(msg.content);
    }
  });
}

/**
 * Run the LangChain agent with message history using bind_tools
 */
export async function runLangChainAgent(
  messages: Array<{
    role: string;
    content: string;
  }>,
  config: LangChainAgentConfig = {}
) {
  const agentStart = Date.now();

  // Log active provider info
  const providerInfo = getActiveProviderInfo(config);
  console.log(`[LangChain Agent] Using provider: ${providerInfo.provider} (${providerInfo.model})`);

  const llm = createLLM(config);

  // Bind read, write, and enhanced tools to the LLM
  const allTools = [...langchainTools, ...crudTools, ...enhancedTools];
  const llmWithTools = llm.bindTools(allTools);

  // Extract the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("Last message must be from user");
  }

  // Build message history with system prompt
  const allMessages = [
    new SystemMessage(SYSTEM_PROMPT),
    ...convertToLangChainMessages(messages),
  ];

  let fullContent = "";
  let toolCalls: any[] = [];
  let iterationCount = 0;
  const maxIterations = 5;

  // Agent loop: invoke LLM, check for tool calls, execute tools, repeat
  while (iterationCount < maxIterations) {
    iterationCount++;

    console.log(`[LangChain Agent] Iteration ${iterationCount}`);
    const iterationStart = Date.now();

    // Invoke LLM with streaming support
    const llmStart = Date.now();
    let response;

    if (config.streaming && config.onToken) {
      // Stream all responses for better perceived performance
      response = await llmWithTools.stream(allMessages);
      let streamedContent = "";
      let hasToolCalls = false;

      for await (const chunk of response) {
        // Check for tool calls in the chunk
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          hasToolCalls = true;
          // Don't stream content when there are tool calls
          // Just accumulate and continue to tool execution
          break;
        }

        if (chunk.content) {
          const token = chunk.content.toString();
          streamedContent += token;
          config.onToken(token);
        }
      }

      const llmDuration = Date.now() - llmStart;
      console.log(`[LangChain Agent] LLM streaming completed in ${llmDuration}ms`);

      // If no tool calls, this is the final response
      if (!hasToolCalls && streamedContent) {
        return {
          content: streamedContent,
          intermediateSteps: toolCalls,
        };
      }

      // If we had tool calls, get the full response to process them
      response = await llmWithTools.invoke(allMessages);
    } else {
      response = await llmWithTools.invoke(allMessages);
      const llmDuration = Date.now() - llmStart;
      console.log(`[LangChain Agent] LLM call completed in ${llmDuration}ms`);
    }

    // Check if there are tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`[LangChain Agent] Tool calls detected:`, response.tool_calls.map(tc => tc.name));

      // Notify about tool calls if callback provided
      if (config.onToolCall) {
        for (const toolCall of response.tool_calls) {
          config.onToolCall(toolCall.name);
        }
      }

      // Add assistant message with tool calls to history
      allMessages.push(response);

      // Execute tools in parallel for better performance
      const toolsStart = Date.now();
      const toolPromises = response.tool_calls.map(async (toolCall) => {
        try {
          const toolStart = Date.now();
          console.log(`[LangChain Agent] Executing tool: ${toolCall.name}`);

          // Find and execute the matching tool from all available tools
          const tool = allTools.find(t => t.name === toolCall.name);
          if (!tool) {
            throw new Error(`Tool not found: ${toolCall.name}`);
          }

          // Call the tool's func directly with proper typing
          const toolResult = await tool.func(toolCall.args as any);
          const toolDuration = Date.now() - toolStart;
          console.log(`[LangChain Agent] Tool ${toolCall.name} completed in ${toolDuration}ms`);

          return {
            success: true,
            toolCall,
            result: toolResult,
          };
        } catch (error) {
          console.error(`[LangChain Agent] Tool execution error:`, error);
          return {
            success: false,
            toolCall,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      // Wait for all tools to complete in parallel
      const toolResults = await Promise.all(toolPromises);
      const toolsDuration = Date.now() - toolsStart;
      console.log(`[LangChain Agent] All tools completed in ${toolsDuration}ms`);

      // Add all tool results to messages
      for (const result of toolResults) {
        if (result.success) {
          allMessages.push({
            role: "tool",
            content: result.result,
            tool_call_id: result.toolCall.id,
          } as any);

          toolCalls.push({
            name: result.toolCall.name,
            args: result.toolCall.args,
            result: result.result,
          });
        } else {
          allMessages.push({
            role: "tool",
            content: JSON.stringify({ error: result.error }),
            tool_call_id: result.toolCall.id,
          } as any);
        }
      }

      // Continue the loop to get final response
      continue;
    }

    // No tool calls - this is the final response
    fullContent = response.content.toString();
    break;
  }

  if (iterationCount >= maxIterations) {
    console.warn(`[LangChain Agent] Max iterations (${maxIterations}) reached`);
  }

  const agentDuration = Date.now() - agentStart;
  console.log(`[LangChain Agent] Total agent execution time: ${agentDuration}ms (${iterationCount} iterations)`);

  return {
    content: fullContent || "I apologize, but I couldn't generate a response. Please try again.",
    intermediateSteps: toolCalls,
  };
}

/**
 * Simple non-streaming chat for backward compatibility
 */
export async function langChainChat(
  userMessage: string,
  chatHistory: BaseMessage[] = [],
  config: LangChainAgentConfig = {}
) {
  // Log active provider info
  const providerInfo = getActiveProviderInfo(config);
  console.log(`[LangChain Chat] Using provider: ${providerInfo.provider} (${providerInfo.model})`);

  const llm = createLLM({ ...config, streaming: false });

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    ...chatHistory,
    new HumanMessage(userMessage),
  ];

  const response = await llm.invoke(messages);
  return response.content.toString();
}
