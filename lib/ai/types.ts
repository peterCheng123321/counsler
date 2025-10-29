/**
 * AI Service Types and Interfaces
 */

export interface AIMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: AIToolCall[];
  tool_call_id?: string;
}

export interface AIChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  suggestions?: string[];
  toolCalls?: AIToolCall[];
}

export interface AIService {
  chat(messages: AIMessage[], options?: AIChatOptions): Promise<AIChatResponse>;
  chatStream(messages: AIMessage[], options?: AIChatOptions): AsyncGenerator<AIChatStreamChunk>;
  generateEmbedding(text: string): Promise<number[]>;
}

export interface AIChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: AITool[];
}

export interface AITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: string | Record<string, any>;
}

export interface AIToolResult {
  toolCallId: string;
  name: string;
  result: any;
}

export interface AIChatStreamChunk {
  type: "token" | "tool_call" | "done" | "error";
  content?: string;
  toolCall?: AIToolCall;
  error?: string;
  done?: boolean;
}

export type AIServiceType = "openai" | "azure-openai" | "gemini" | "fallback";

