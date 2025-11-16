/**
 * LLM Factory - Centralized AI Model Creation
 * Supports multiple AI providers with automatic fallback
 * Now with intelligent model routing for cost optimization and FERPA compliance
 */

import { ChatOpenAI, AzureChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  selectOptimalModel,
  ModelSelectionContext,
  type AIProvider
} from "./model-router";

export type { AIProvider };

export interface LLMConfig {
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  preferredProvider?: AIProvider;
  // NEW: Task context for intelligent model routing
  context?: ModelSelectionContext;
}

export interface AIProviderStatus {
  provider: AIProvider;
  available: boolean;
  reason?: string;
}

/**
 * Get all available AI providers and their status
 */
export function getAvailableProviders(): AIProviderStatus[] {
  const providers: AIProviderStatus[] = [];

  // Check Azure OpenAI
  if (
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  ) {
    providers.push({ provider: "azure", available: true });
  } else {
    providers.push({
      provider: "azure",
      available: false,
      reason: "Missing AZURE_OPENAI_* environment variables",
    });
  }

  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    providers.push({ provider: "openai", available: true });
  } else {
    providers.push({
      provider: "openai",
      available: false,
      reason: "Missing OPENAI_API_KEY environment variable",
    });
  }

  // Check Google Gemini
  if (process.env.GEMINI_API_KEY) {
    providers.push({ provider: "gemini", available: true });
  } else {
    providers.push({
      provider: "gemini",
      available: false,
      reason: "Missing GEMINI_API_KEY environment variable",
    });
  }

  return providers;
}

/**
 * Get the preferred provider from environment or config
 */
function getPreferredProvider(config?: LLMConfig): AIProvider | undefined {
  // Config takes priority
  if (config?.preferredProvider) {
    return config.preferredProvider;
  }

  // Then check environment variable
  const envProvider = process.env.AI_PROVIDER?.toLowerCase();
  if (envProvider === "azure" || envProvider === "openai" || envProvider === "gemini") {
    return envProvider as AIProvider;
  }

  return undefined;
}

/**
 * Create Azure OpenAI instance
 */
function createAzureOpenAI(config: LLMConfig): AzureChatOpenAI {
  console.log("[LLM Factory] Creating Azure OpenAI instance");

  const { temperature = 0.7, maxTokens = 2000, streaming = false } = config;

  return new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY!,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT!
      .replace("https://", "")
      .replace(".openai.azure.com/", "")
      .replace(".openai.azure.com", ""),
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview",
    temperature,
    maxTokens,
    streaming,
    timeout: 30000, // 30 second timeout for speed
    maxRetries: 1, // Reduce retries for faster failure
  });
}

/**
 * Create OpenAI instance
 */
function createOpenAI(config: LLMConfig, modelName?: string): ChatOpenAI {
  const effectiveModel = modelName || process.env.OPENAI_MODEL || "gpt-4o-mini";
  console.log(`[LLM Factory] Creating OpenAI instance (${effectiveModel})`);

  const { temperature = 0.7, maxTokens = 2000, streaming = false } = config;

  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: effectiveModel,
    temperature,
    maxTokens,
    streaming,
  });
}

/**
 * Create Google Gemini instance
 */
function createGemini(config: LLMConfig): ChatGoogleGenerativeAI {
  console.log("[LLM Factory] Creating Google Gemini instance");

  const { temperature = 0.7, maxTokens = 2000, streaming = false } = config;

  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
    temperature,
    maxOutputTokens: maxTokens,
    streaming,
  });
}

/**
 * Create LLM with automatic provider selection and fallback
 * NEW: Supports intelligent model routing based on task context
 */
export function createLLM(config: LLMConfig = {}): ChatOpenAI | AzureChatOpenAI | ChatGoogleGenerativeAI {
  const availableProviders = getAvailableProviders();
  let preferredProvider = getPreferredProvider(config);

  // NEW: Intelligent Model Routing
  let modelName: string | undefined;
  let routedConfig = { ...config };

  if (config.context) {
    console.log("[LLM Factory] Using intelligent model routing");
    const optimalModel = selectOptimalModel(config.context);

    // Override provider and model based on router decision
    preferredProvider = optimalModel.provider;
    modelName = optimalModel.modelName;

    // Apply tier-specific temperature and token settings
    routedConfig.temperature = config.temperature ?? optimalModel.temperature;
    routedConfig.maxTokens = config.maxTokens ?? optimalModel.maxTokens;
    routedConfig.preferredProvider = optimalModel.provider;

    console.log(
      `[LLM Factory] Router selected: ${optimalModel.provider}/${optimalModel.modelName}`,
      `(tier: ${optimalModel.tier}, cost: $${optimalModel.estimatedCost}, FERPA: ${optimalModel.isFERPACompliant})`
    );
  }

  // Log available providers
  console.log("[LLM Factory] Available providers:",
    availableProviders
      .filter(p => p.available)
      .map(p => p.provider)
      .join(", ")
  );

  if (preferredProvider) {
    console.log(`[LLM Factory] Preferred provider: ${preferredProvider}`);
  }

  // Try preferred provider first if specified and available
  if (preferredProvider) {
    const providerStatus = availableProviders.find(p => p.provider === preferredProvider);
    if (providerStatus?.available) {
      try {
        switch (preferredProvider) {
          case "azure":
            return createAzureOpenAI(routedConfig);
          case "openai":
            return createOpenAI(routedConfig, modelName);
          case "gemini":
            return createGemini(routedConfig);
        }
      } catch (error) {
        console.warn(`[LLM Factory] Failed to create ${preferredProvider}:`, error);
        console.log("[LLM Factory] Falling back to other providers...");
      }
    } else {
      console.warn(
        `[LLM Factory] Preferred provider ${preferredProvider} not available: ${providerStatus?.reason}`
      );
    }
  }

  // Fallback logic: Try providers in order of priority
  // Default priority: Azure > OpenAI > Gemini
  const allProviders: AIProvider[] = ["azure", "openai", "gemini"];
  const fallbackOrder: AIProvider[] = preferredProvider
    ? (allProviders.filter(p => p !== preferredProvider) as AIProvider[])
    : allProviders;

  for (const provider of fallbackOrder) {
    const providerStatus = availableProviders.find(p => p.provider === provider);
    if (providerStatus?.available) {
      try {
        switch (provider) {
          case "azure":
            return createAzureOpenAI(routedConfig);
          case "openai":
            return createOpenAI(routedConfig, modelName);
          case "gemini":
            return createGemini(routedConfig);
        }
      } catch (error) {
        console.warn(`[LLM Factory] Failed to create ${provider}:`, error);
        continue;
      }
    }
  }

  // No providers available
  const unavailableReasons = availableProviders
    .filter(p => !p.available)
    .map(p => `${p.provider}: ${p.reason}`)
    .join("; ");

  throw new Error(
    `No AI providers available. Please configure at least one:\n${unavailableReasons}`
  );
}

/**
 * Get information about the currently active provider
 */
export function getActiveProviderInfo(config: LLMConfig = {}): {
  provider: AIProvider;
  model: string;
} {
  const preferredProvider = getPreferredProvider(config);
  const availableProviders = getAvailableProviders();

  // Determine which provider will be used
  let activeProvider: AIProvider = "azure"; // default

  if (preferredProvider) {
    const providerStatus = availableProviders.find(p => p.provider === preferredProvider);
    if (providerStatus?.available) {
      activeProvider = preferredProvider;
    }
  } else {
    // Use first available in priority order
    const fallbackOrder: AIProvider[] = ["azure", "openai", "gemini"];
    for (const provider of fallbackOrder) {
      const providerStatus = availableProviders.find(p => p.provider === provider);
      if (providerStatus?.available) {
        activeProvider = provider;
        break;
      }
    }
  }

  // Get model name for active provider
  let model = "unknown";
  switch (activeProvider) {
    case "azure":
      model = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4";
      break;
    case "openai":
      model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      break;
    case "gemini":
      model = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
      break;
  }

  return { provider: activeProvider, model };
}

// ============================================================================
// Convenience Functions for Model Router Integration
// ============================================================================

/**
 * Create LLM optimized for a specific tool
 * Automatically routes to the appropriate model tier
 */
export function createLLMForTool(
  toolName: string,
  config: Omit<LLMConfig, 'context'> = {}
): ChatOpenAI | AzureChatOpenAI | ChatGoogleGenerativeAI {
  return createLLM({
    ...config,
    context: { toolName },
  });
}

/**
 * Create LLM for chatbot conversations
 * Uses large-context tier with PII protection
 */
export function createLLMForChatbot(
  config: Omit<LLMConfig, 'context'> & { hasPII?: boolean } = {}
): ChatOpenAI | AzureChatOpenAI | ChatGoogleGenerativeAI {
  const { hasPII = true, ...llmConfig } = config;

  return createLLM({
    ...llmConfig,
    context: {
      taskType: 'interactive',
      complexity: 'moderate',
      hasPII,
      requiresLargeContext: true,
    },
  });
}

/**
 * Create LLM for generation tasks (LOR, essays, etc.)
 * Uses high-reasoning tier with FERPA compliance
 */
export function createLLMForGeneration(
  config: Omit<LLMConfig, 'context'> & { hasPII?: boolean } = {}
): ChatOpenAI | AzureChatOpenAI | ChatGoogleGenerativeAI {
  const { hasPII = true, ...llmConfig } = config;

  return createLLM({
    ...llmConfig,
    context: {
      taskType: 'generation',
      complexity: 'complex',
      hasPII,
      requiresReasoning: true,
    },
  });
}

/**
 * Create LLM for simple queries
 * Uses fast-cheap tier for cost optimization
 */
export function createLLMForQuery(
  config: Omit<LLMConfig, 'context'> = {}
): ChatOpenAI | AzureChatOpenAI | ChatGoogleGenerativeAI {
  return createLLM({
    ...config,
    context: {
      taskType: 'query',
      complexity: 'simple',
      hasPII: false,
    },
  });
}
