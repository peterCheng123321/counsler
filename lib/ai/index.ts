/**
 * AI Service Manager
 * Handles fallback logic and service selection
 */

import { AIService, AIMessage, AIChatResponse, AIChatOptions, AIServiceType, AIChatStreamChunk } from "./types";
import { OpenAIService } from "./openai";
import { AzureOpenAIService } from "./azure-openai";
import { GeminiService } from "./gemini";
import { FallbackAIService } from "./fallback";

export class AIServiceManager {
  private services: Map<AIServiceType, AIService>;
  private preferredService: AIServiceType;
  private fallbackOrder: AIServiceType[];

  constructor() {
    this.services = new Map();
    this.preferredService = this.detectPreferredService();
    this.fallbackOrder = this.getFallbackOrder();
    this.initializeServices();
  }

  private detectPreferredService(): AIServiceType {
    if (
      process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    ) {
      return "azure-openai";
    }

    if (process.env.OPENAI_API_KEY) {
      return "openai";
    }

    if (process.env.GEMINI_API_KEY) {
      return "gemini";
    }

    return "fallback";
  }

  private getFallbackOrder(): AIServiceType[] {
    const order: AIServiceType[] = [];
    const preferred = this.preferredService;

    order.push(preferred);

    if (preferred !== "azure-openai" && this.isServiceAvailable("azure-openai")) {
      order.push("azure-openai");
    }
    if (preferred !== "openai" && this.isServiceAvailable("openai")) {
      order.push("openai");
    }
    if (preferred !== "gemini" && this.isServiceAvailable("gemini")) {
      order.push("gemini");
    }

    order.push("fallback");

    return order;
  }

  private isServiceAvailable(service: AIServiceType): boolean {
    switch (service) {
      case "azure-openai":
        return !!(
          process.env.AZURE_OPENAI_ENDPOINT &&
          process.env.AZURE_OPENAI_API_KEY &&
          process.env.AZURE_OPENAI_DEPLOYMENT_NAME
        );
      case "openai":
        return !!process.env.OPENAI_API_KEY;
      case "gemini":
        return !!process.env.GEMINI_API_KEY;
      case "fallback":
        return true;
      default:
        return false;
    }
  }

  private initializeServices() {
    if (this.isServiceAvailable("openai")) {
      try {
        this.services.set("openai", new OpenAIService());
      } catch (error) {
        console.warn("Failed to initialize OpenAI service:", error);
      }
    }

    if (this.isServiceAvailable("azure-openai")) {
      try {
        this.services.set("azure-openai", new AzureOpenAIService());
      } catch (error) {
        console.warn("Failed to initialize Azure OpenAI service:", error);
      }
    }

    if (this.isServiceAvailable("gemini")) {
      try {
        this.services.set("gemini", new GeminiService());
      } catch (error) {
        console.warn("Failed to initialize Gemini service:", error);
      }
    }

    this.services.set("fallback", new FallbackAIService());
  }

  async chat(
    messages: AIMessage[],
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    let lastError: Error | null = null;

    for (const serviceType of this.fallbackOrder) {
      const service = this.services.get(serviceType);
      if (!service) continue;

      try {
        const response = await service.chat(messages, options);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`AI service ${serviceType} failed:`, lastError.message);
      }
    }

    throw new Error(
      `All AI services failed. Last error: ${lastError?.message || "Unknown error"}`
    );
  }

  async *chatStream(
    messages: AIMessage[],
    options?: AIChatOptions
  ): AsyncGenerator<AIChatStreamChunk> {
    let lastError: Error | null = null;

    for (const serviceType of this.fallbackOrder) {
      const service = this.services.get(serviceType);
      if (!service) continue;

      try {
        yield* service.chatStream(messages, options);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`AI service ${serviceType} failed:`, lastError.message);
      }
    }

    yield {
      type: "error",
      error: `All AI services failed. Last error: ${lastError?.message || "Unknown error"}`,
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const openaiService = this.services.get("openai");
    if (openaiService) {
      try {
        return await openaiService.generateEmbedding(text);
      } catch (error) {
        console.warn("OpenAI embedding failed, using fallback");
      }
    }

    return this.simpleHashEmbedding(text);
  }

  private simpleHashEmbedding(text: string): number[] {
    const hash = text.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    return new Array(1536).fill(0).map((_, i) => {
      return Math.sin((hash + i) * 0.1) * 0.1;
    });
  }
}

export const aiServiceManager = new AIServiceManager();

