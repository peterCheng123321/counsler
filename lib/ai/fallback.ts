/**
 * Fallback AI Service
 * Provides basic responses when no AI service is available
 */

import { AIService, AIMessage, AIChatResponse, AIChatOptions, AIChatStreamChunk } from "./types";

export class FallbackAIService implements AIService {
  async chat(
    messages: AIMessage[],
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content.toLowerCase() || "";

    let response = "I'm here to help! However, AI services are not currently configured. ";

    if (content.includes("student") || content.includes("students")) {
      response +=
        "You can manage students from the Students page. Would you like to see student information?";
    } else if (content.includes("task") || content.includes("tasks")) {
      response +=
        "You can manage tasks from the Tasks page. Would you like to see your tasks?";
    } else if (content.includes("deadline") || content.includes("due")) {
      response +=
        "You can check deadlines and due dates in the Tasks page. Would you like to see upcoming deadlines?";
    } else if (
      content.includes("letter") ||
      content.includes("recommendation") ||
      content.includes("lor")
    ) {
      response +=
        "Letter of Recommendation generation is coming soon. Please check back later.";
    } else {
      response += "Please configure an AI service (OpenAI, Azure OpenAI, or Gemini) to enable full functionality.";
    }

    return {
      content: response,
      model: "fallback",
    };
  }

  async *chatStream(
    messages: AIMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<AIChatStreamChunk> {
    const response = await this.chat(messages, options);
    
    // Simulate streaming by yielding tokens word by word
    const words = response.content.split(" ");
    for (const word of words) {
      yield {
        type: "token",
        content: word + " ",
      };
      // Small delay to simulate streaming
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    
    yield { type: "done", done: true };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    throw new Error("Embeddings not available in fallback service");
  }
}
