/**
 * Google Gemini Service Implementation
 * Note: Gemini has limited function calling support compared to OpenAI
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIService, AIMessage, AIChatResponse, AIChatOptions, AIChatStreamChunk } from "./types";

export class GeminiService implements AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async chat(
    messages: AIMessage[],
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    try {
      const systemMessages = messages.filter((m) => m.role === "system");
      const systemPrompt = systemMessages.map((m) => m.content).join("\n") || options?.systemPrompt;
      const nonSystemMessages = messages.filter((m) => m.role !== "system");

      const geminiMessages = nonSystemMessages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      if (systemPrompt && geminiMessages.length > 0) {
        geminiMessages[0].parts[0].text = `${systemPrompt}\n\n${geminiMessages[0].parts[0].text}`;
      }

      const chat = this.model.startChat({
        history: geminiMessages.slice(0, -1),
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2000,
        },
      });

      const lastMessage = geminiMessages[geminiMessages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        model: "gemini-pro",
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini service error: ${error.message}`);
      }
      throw error;
    }
  }

  async *chatStream(
    messages: AIMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<AIChatStreamChunk> {
    try {
      const systemMessages = messages.filter((m) => m.role === "system");
      const systemPrompt = systemMessages.map((m) => m.content).join("\n") || options?.systemPrompt;
      const nonSystemMessages = messages.filter((m) => m.role !== "system");

      const geminiMessages = nonSystemMessages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      if (systemPrompt && geminiMessages.length > 0) {
        geminiMessages[0].parts[0].text = `${systemPrompt}\n\n${geminiMessages[0].parts[0].text}`;
      }

      const chat = this.model.startChat({
        history: geminiMessages.slice(0, -1),
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2000,
        },
      });

      const lastMessage = geminiMessages[geminiMessages.length - 1];
      const result = await chat.sendMessageStream(lastMessage.parts[0].text);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield {
            type: "token",
            content: text,
          };
        }
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
    throw new Error("Gemini embeddings not configured");
  }
}
