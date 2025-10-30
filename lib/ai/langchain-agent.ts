/**
 * LangChain Agent Implementation
 * Provides AI agent with tool calling support for all AI providers
 */

import { ChatOpenAI } from "@langchain/openai";
import { AzureChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
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
  const { temperature = 0.7, maxTokens = 2000, streaming = true } = config;

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
      ).replace(".openai.azure.com/", ""),
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
    tool_calls?: any[];
    tool_call_id?: string;
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
 * Create a LangChain agent executor
 */
export async function createLangChainAgent(config: LangChainAgentConfig = {}) {
  const llm = createLLM(config);

  // Create prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Create agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: langchainTools,
    prompt,
  });

  // Create executor
  const executor = new AgentExecutor({
    agent,
    tools: langchainTools,
    verbose: process.env.NODE_ENV === "development",
    maxIterations: 5,
  });

  return executor;
}

/**
 * Run the LangChain agent with message history
 */
export async function runLangChainAgent(
  messages: Array<{
    role: string;
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
  }>,
  config: LangChainAgentConfig = {}
) {
  const executor = await createLangChainAgent(config);

  // Extract the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("Last message must be from user");
  }

  // Convert message history (excluding the last message)
  const chatHistory = convertToLangChainMessages(messages.slice(0, -1));

  // Run the agent
  const result = await executor.invoke({
    input: lastMessage.content,
    chat_history: chatHistory,
  });

  return {
    content: result.output,
    intermediateSteps: result.intermediateSteps,
  };
}

/**
 * Stream the LangChain agent response
 */
export async function* streamLangChainAgent(
  messages: Array<{
    role: string;
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
  }>,
  config: LangChainAgentConfig = {}
) {
  const executor = await createLangChainAgent({ ...config, streaming: true });

  // Extract the last user message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("Last message must be from user");
  }

  // Convert message history (excluding the last message)
  const chatHistory = convertToLangChainMessages(messages.slice(0, -1));

  // Stream the agent response
  const stream = await executor.stream({
    input: lastMessage.content,
    chat_history: chatHistory,
  });

  for await (const chunk of stream) {
    // Handle different types of chunks
    if (chunk.output) {
      // Final output
      yield {
        type: "content" as const,
        content: chunk.output,
      };
    } else if (chunk.intermediateSteps) {
      // Tool execution steps
      for (const step of chunk.intermediateSteps) {
        yield {
          type: "tool_call" as const,
          toolName: step.action?.tool || "unknown",
          toolInput: step.action?.toolInput || {},
        };

        if (step.observation) {
          yield {
            type: "tool_result" as const,
            result: step.observation,
          };
        }
      }
    }
  }
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

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    ...chatHistory.map((msg) => {
      if (msg instanceof HumanMessage) {
        return ["human", msg.content] as [string, string];
      } else if (msg instanceof AIMessage) {
        return ["assistant", msg.content] as [string, string];
      } else {
        return ["system", msg.content] as [string, string];
      }
    }),
    ["human", userMessage],
  ]);

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({});

  return response.content.toString();
}
