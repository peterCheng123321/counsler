/**
 * Azure OpenAI Service Implementation
 * Using OpenAI SDK directly with Azure endpoint configuration
 */

import OpenAI from "openai";
import { AIService, AIMessage, AIChatResponse, AIChatOptions, AIChatStreamChunk, AIToolCall } from "./types";

export class AzureOpenAIService implements AIService {
  private client: OpenAI;

  constructor() {
    if (
      !process.env.AZURE_OPENAI_ENDPOINT ||
      !process.env.AZURE_OPENAI_API_KEY ||
      !process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    ) {
      throw new Error("Azure OpenAI configuration is incomplete");
    }

    // Azure OpenAI uses OpenAI SDK with custom base URL and API key
    this.client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
      defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview" },
      defaultHeaders: {
        "api-key": process.env.AZURE_OPENAI_API_KEY,
      },
    });
  }

  async chat(
    messages: AIMessage[],
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    try {
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;

      const systemMessages = messages.filter((m) => m.role === "system");
      const nonSystemMessages = messages.filter((m) => m.role !== "system");
      
      const systemPrompt = systemMessages.map((m) => m.content).join("\n") || options?.systemPrompt;
      const messagesToSend = systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }, ...nonSystemMessages]
        : nonSystemMessages;

      const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messagesToSend.map((msg) => {
        if (msg.tool_calls) {
          return {
            role: "assistant" as const,
            content: msg.content,
            tool_calls: msg.tool_calls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments),
              },
            })),
          } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
        }
        if (msg.tool_call_id || msg.role === "tool") {
          return {
            role: "tool" as const,
            content: msg.content,
            tool_call_id: msg.tool_call_id || "",
          } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
        }
        if (msg.role === "system") {
          return {
            role: "system" as const,
            content: msg.content,
          } as OpenAI.Chat.Completions.ChatCompletionSystemMessageParam;
        }
        if (msg.role === "assistant") {
          return {
            role: "assistant" as const,
            content: msg.content,
          } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
        }
        return {
          role: "user" as const,
          content: msg.content,
        } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam;
      });

      const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: deploymentName,
        messages: requestMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
      };

      if (options?.tools && options.tools.length > 0) {
        requestOptions.tools = options.tools.map((tool) => ({
          type: "function" as const,
          function: tool.function,
        }));
      }

      const response = await this.client.chat.completions.create(requestOptions);

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error("No response from Azure OpenAI");
      }

      const toolCalls: AIToolCall[] = [];
      if (choice.message.tool_calls) {
        for (const tc of choice.message.tool_calls) {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          });
        }
      }

      return {
        content: choice.message.content || "",
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        model: deploymentName,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Azure OpenAI service error: ${error.message}`);
      }
      throw error;
    }
  }

  async *chatStream(
    messages: AIMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<AIChatStreamChunk> {
    try {
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;

      const systemMessages = messages.filter((m) => m.role === "system");
      const nonSystemMessages = messages.filter((m) => m.role !== "system");
      
      const systemPrompt = systemMessages.map((m) => m.content).join("\n") || options?.systemPrompt;
      const messagesToSend = systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }, ...nonSystemMessages]
        : nonSystemMessages;

      const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messagesToSend.map((msg) => {
        if (msg.tool_calls) {
          return {
            role: "assistant" as const,
            content: msg.content,
            tool_calls: msg.tool_calls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments),
              },
            })),
          } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
        }
        if (msg.tool_call_id || msg.role === "tool") {
          return {
            role: "tool" as const,
            content: msg.content,
            tool_call_id: msg.tool_call_id || "",
          } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam;
        }
        if (msg.role === "system") {
          return {
            role: "system" as const,
            content: msg.content,
          } as OpenAI.Chat.Completions.ChatCompletionSystemMessageParam;
        }
        if (msg.role === "assistant") {
          return {
            role: "assistant" as const,
            content: msg.content,
          } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
        }
        return {
          role: "user" as const,
          content: msg.content,
        } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam;
      });

      const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
        model: deploymentName,
        messages: requestMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
        stream: true,
      };

      if (options?.tools && options.tools.length > 0) {
        requestOptions.tools = options.tools.map((tool) => ({
          type: "function" as const,
          function: tool.function,
        }));
      }

      const stream = await this.client.chat.completions.create(requestOptions);

      let currentToolCall: Partial<AIToolCall> | null = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.tool_calls && delta.tool_calls.length > 0) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (!currentToolCall || currentToolCall.id !== toolCallDelta.id) {
                if (currentToolCall && currentToolCall.id && currentToolCall.name) {
                  yield {
                    type: "tool_call",
                    toolCall: currentToolCall as AIToolCall,
                  };
                }
                currentToolCall = {
                  id: toolCallDelta.id || "",
                  name: toolCallDelta.function?.name || "",
                  arguments: toolCallDelta.function?.arguments || "",
                };
              } else if (currentToolCall) {
                currentToolCall.name = currentToolCall.name || toolCallDelta.function?.name || "";
                currentToolCall.arguments = ((currentToolCall.arguments as string) || "") + (toolCallDelta.function?.arguments || "");
              }
            }
          }
        }

        if (delta.content) {
          yield {
            type: "token",
            content: delta.content,
          };
        }
      }

      if (currentToolCall && currentToolCall.id && currentToolCall.name) {
        yield {
          type: "tool_call",
          toolCall: currentToolCall as AIToolCall,
        };
      }

      yield { type: "done", done: true };
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    throw new Error("Azure OpenAI embeddings not configured");
  }
}
