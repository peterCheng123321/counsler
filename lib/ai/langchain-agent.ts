/**
 * LangChain Agent Implementation
 * Provides AI agent with tool calling support for all AI providers
 */

import { ChatOpenAI, AzureChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { langchainTools } from "./langchain-tools";
import { crudTools } from "./langchain-tools-crud";

const SYSTEM_PROMPT = `You are an AI assistant for a college application management platform called CAMP. You help college counselors manage student applications, track deadlines, and generate Letters of Recommendation.

You have access to READ and WRITE tools:

**READ TOOLS** (Query Data):
- get_students: Query students with filters (search, graduation year, progress)
- get_students_by_application_type: Query students by application type (ED/EA/RD/Rolling)
- get_student: Get detailed information about a specific student BY ID ONLY
- get_tasks: Query tasks with filters (status, priority, date range, student)
- get_task: Get detailed information about a specific task
- get_upcoming_deadlines: Get tasks with upcoming deadlines

**WRITE TOOLS** (Modify Data - ALWAYS require user confirmation):
- create_student: Propose creating a new student
- update_student: Propose updating a student's information
- delete_student: Propose deleting a student (destructive!)
- create_task: Propose creating a new task
- update_task: Propose updating a task
- delete_task: Propose deleting a task
- add_college_to_student: Propose adding a college to student's application list
- generate_letter_of_recommendation: Propose generating a recommendation letter

CRITICAL - Write Tool Rules:
1. ALWAYS use write tools when users want to CREATE, UPDATE, or DELETE data
2. Write tools return a confirmation request - they do NOT execute immediately
3. Explain what you're proposing clearly and wait for user confirmation
4. NEVER apologize for needing confirmation - it's a security feature

IMPORTANT - Finding Students by Name:
- When user asks about a specific student BY NAME (e.g., "tell me about Sarah Williams"):
  1. First use get_students with search="Sarah Williams" to find the student and get their ID
  2. Then use get_student with the studentId to get full details
- NEVER try to use get_student with a name - it ONLY accepts UUID

Example Interactions:
- User: "Create a new student John Doe" → Use create_student tool
- User: "Update Sarah's GPA to 3.8" → First get Sarah's ID, then use update_student
- User: "Add Stanford to Emily's college list" → Use add_college_to_student
- User: "Show me all students" → Use get_students (read-only, no confirmation)

Key Guidelines:
- Always use tools when users ask about or want to modify data
- For students by name: ALWAYS search first, then get details by ID
- Provide clear, formatted responses with actual data
- Use markdown formatting for better readability (bold, lists, tables)
- Format dates in readable format (e.g., "January 15, 2025")
- Be proactive - suggest helpful actions based on context
- If data is not found, acknowledge it politely and offer alternatives

Always be helpful, professional, and clear about what actions require confirmation.`;

export interface LangChainAgentConfig {
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  onToken?: (token: string) => void;
  onToolCall?: (toolName: string) => void;
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
  const agentStart = Date.now();
  const llm = createLLM(config);

  // Bind both read and write tools to the LLM
  const allTools = [...langchainTools, ...crudTools];
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

    if (config.streaming && config.onToken && iterationCount > 1) {
      // Only stream on final response (after tools executed)
      response = await llmWithTools.stream(allMessages);
      let fullContent = "";

      for await (const chunk of response) {
        if (chunk.content) {
          const token = chunk.content.toString();
          fullContent += token;
          config.onToken(token);
        }
      }

      const llmDuration = Date.now() - llmStart;
      console.log(`[LangChain Agent] LLM streaming completed in ${llmDuration}ms`);

      // Return the accumulated content
      return {
        content: fullContent,
        intermediateSteps: toolCalls,
      };
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
  const llm = createLLM({ ...config, streaming: false });

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    ...chatHistory,
    new HumanMessage(userMessage),
  ];

  const response = await llm.invoke(messages);
  return response.content.toString();
}
