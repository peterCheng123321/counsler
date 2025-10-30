/**
 * LangChain Agent Implementation
 * Provides AI agent with tool calling support for all AI providers
 */

import { ChatOpenAI, AzureChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { langchainTools } from "./langchain-tools";

const SYSTEM_PROMPT = `You are an AI assistant for a college application management platform called CAMP. You help college counselors manage student applications, track deadlines, and generate Letters of Recommendation.

You have access to the following tools:
- get_students: Query students with filters (search, graduation year, progress)
- get_students_by_application_type: Query students by application type (ED=Early Decision, EA=Early Action, RD=Regular Decision, Rolling)
- get_student: Get detailed information about a specific student
- get_tasks: Query tasks with filters (status, priority, date range, student)
- get_task: Get detailed information about a specific task
- get_upcoming_deadlines: Get tasks with upcoming deadlines

When users ask about students by application type (e.g., "students applying Early Decision"), use get_students_by_application_type with applicationType="ED" for Early Decision, "EA" for Early Action, "RD" for Regular Decision, or "Rolling" for Rolling admission.

When users ask about students, tasks, or deadlines, use the appropriate tools to fetch real data from the database. Then provide a helpful response based on the actual data.

Key guidelines:
- Always use tools when users ask about specific data (students, tasks, deadlines)
- Provide clear, formatted responses with the actual data
- Be concise but thorough in your responses
- Format dates in a readable format (e.g., "January 15, 2025")
- If data is not found, acknowledge it politely

Always be helpful and professional.`;

export interface LangChainAgentConfig {
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

/**
 * Create and configure the appropriate LLM based on available environment variables
 */
function createLLM(config: LangChainAgentConfig = {}) {
  const { temperature = 0.7, maxTokens = 2000, streaming = false } = config;

  // Try Azure OpenAI first
  if (
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  ) {
    console.log("Using Azure OpenAI with LangChain");
    return new AzureChatOpenAI({
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT.replace(
        "https://",
        ""
      ).replace(".openai.azure.com/", "").replace(".openai.azure.com", ""),
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview",
      temperature,
      maxTokens,
      streaming,
    });
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    console.log("Using OpenAI with LangChain");
    return new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini",
      temperature,
      maxTokens,
      streaming,
    });
  }

  throw new Error(
    "No AI service configured. Please set AZURE_OPENAI_API_KEY or OPENAI_API_KEY in your environment variables."
  );
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
  const llm = createLLM(config);

  // Bind tools to the LLM
  const llmWithTools = llm.bindTools(langchainTools);

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

    // Invoke LLM
    const response = await llmWithTools.invoke(allMessages);

    // Check if there are tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`[LangChain Agent] Tool calls detected:`, response.tool_calls.map(tc => tc.name));

      // Add assistant message with tool calls to history
      allMessages.push(response);

      // Execute each tool
      for (const toolCall of response.tool_calls) {
        const tool = langchainTools.find(t => t.name === toolCall.name);

        if (tool) {
          try {
            console.log(`[LangChain Agent] Executing tool: ${toolCall.name}`);
            // Use call() method instead of invoke() for better type compatibility
            const toolResult = await tool.call(toolCall.args);

            // Add tool result to messages
            allMessages.push({
              role: "tool",
              content: toolResult,
              tool_call_id: toolCall.id,
            } as any);

            toolCalls.push({
              name: toolCall.name,
              args: toolCall.args,
              result: toolResult,
            });
          } catch (error) {
            console.error(`[LangChain Agent] Tool execution error:`, error);
            // Add error as tool result
            allMessages.push({
              role: "tool",
              content: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
              }),
              tool_call_id: toolCall.id,
            } as any);
          }
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
  const llm = createLLM({ ...config, streaming: false });

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    ...chatHistory,
    new HumanMessage(userMessage),
  ];

  const response = await llm.invoke(messages);
  return response.content.toString();
}
