/**
 * Intelligent Model Selection Router
 *
 * Routes AI tasks to optimal models based on:
 * - Task complexity (simple, moderate, complex)
 * - Data sensitivity (PII/FERPA compliance)
 * - Cost optimization
 * - Performance requirements
 *
 * Aligned with Blueprint Section 6.4: Hybrid-Model Approach
 */

import { AIProvider } from './types';

// Re-export AIProvider for use by other modules
export type { AIProvider };

// ============================================================================
// Type Definitions
// ============================================================================

export type TaskComplexity = 'simple' | 'moderate' | 'complex';
export type ModelTier = 'fast-cheap' | 'large-context' | 'high-reasoning' | 'secure-private';

export interface ModelSelectionContext {
  // Task identification
  toolName?: string;
  taskType?: 'query' | 'crud' | 'generation' | 'analysis' | 'interactive';

  // Complexity indicators
  complexity?: TaskComplexity;
  requiresReasoning?: boolean;
  requiresLargeContext?: boolean;

  // Data sensitivity
  hasPII?: boolean;
  requiresAudit?: boolean;

  // Performance constraints
  maxCostPerRequest?: number;
  maxResponseTime?: number; // milliseconds

  // Provider preferences
  preferredProvider?: AIProvider;
  allowedProviders?: AIProvider[];
}

export interface ModelConfig {
  provider: AIProvider;
  modelName: string;
  temperature: number;
  maxTokens: number;
  estimatedCost: number; // USD per request
  estimatedResponseTime: number; // milliseconds
  tier: ModelTier;
  isFERPACompliant: boolean;
}

// ============================================================================
// Model Definitions (Hybrid Architecture)
// ============================================================================

/**
 * Fast & Cheap Models
 * Use for: Simple queries, data retrieval, categorization
 * Cost: $ (cheap)
 * Speed: Very fast (<500ms)
 */
const FAST_CHEAP_MODELS: ModelConfig[] = [
  {
    provider: 'openai',
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000,
    estimatedCost: 0.0003,
    estimatedResponseTime: 400,
    tier: 'fast-cheap',
    isFERPACompliant: false,
  },
  {
    provider: 'openai',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.3,
    maxTokens: 1000,
    estimatedCost: 0.0002,
    estimatedResponseTime: 350,
    tier: 'fast-cheap',
    isFERPACompliant: false,
  },
];

/**
 * Large Context / RAG Models
 * Use for: Document analysis, essay review, summarization
 * Cost: $$ (moderate)
 * Speed: Moderate (1-2s)
 */
const LARGE_CONTEXT_MODELS: ModelConfig[] = [
  {
    provider: 'azure',
    modelName: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 2000,
    estimatedCost: 0.0015,
    estimatedResponseTime: 1500,
    tier: 'large-context',
    isFERPACompliant: true,
  },
  {
    provider: 'openai',
    modelName: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 2000,
    estimatedCost: 0.0012,
    estimatedResponseTime: 1200,
    tier: 'large-context',
    isFERPACompliant: false,
  },
];

/**
 * High Reasoning Models
 * Use for: LOR generation, complex analysis, creative writing
 * Cost: $$$ (expensive)
 * Speed: Slower (2-4s)
 */
const HIGH_REASONING_MODELS: ModelConfig[] = [
  {
    provider: 'azure',
    modelName: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 3000,
    estimatedCost: 0.002,
    estimatedResponseTime: 2500,
    tier: 'high-reasoning',
    isFERPACompliant: true,
  },
  {
    provider: 'openai',
    modelName: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 3000,
    estimatedCost: 0.0018,
    estimatedResponseTime: 2000,
    tier: 'high-reasoning',
    isFERPACompliant: false,
  },
];

/**
 * Secure/Private Models (FERPA Compliant)
 * Use for: ALL PII processing, student data, transcripts
 * Cost: $$$ (premium for compliance)
 * Speed: Variable
 * REQUIRED for: Any tool accessing student_id, essays, transcripts, LORs
 */
const SECURE_PRIVATE_MODELS: ModelConfig[] = [
  {
    provider: 'azure',
    modelName: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 2000,
    estimatedCost: 0.002,
    estimatedResponseTime: 1800,
    tier: 'secure-private',
    isFERPACompliant: true,
  },
];

// ============================================================================
// Tool-to-Tier Mapping
// ============================================================================

/**
 * Maps tool names to their required model tier
 * This determines which model pool to select from
 */
const TOOL_TO_TIER_MAP: Record<string, { tier: ModelTier; hasPII: boolean }> = {
  // ===== SIMPLE / FAST & CHEAP =====
  'get_students': { tier: 'fast-cheap', hasPII: true }, // Note: hasPII forces upgrade to secure
  'get_tasks': { tier: 'fast-cheap', hasPII: false },
  'get_upcoming_deadlines': { tier: 'fast-cheap', hasPII: false },
  'get_colleges': { tier: 'fast-cheap', hasPII: false },

  // ===== MODERATE / LARGE CONTEXT =====
  'get_student': { tier: 'large-context', hasPII: true },
  'search_essays': { tier: 'large-context', hasPII: true },
  'open_essay_canvas': { tier: 'large-context', hasPII: true },
  'open_student_canvas': { tier: 'large-context', hasPII: true },
  'get_essays': { tier: 'large-context', hasPII: true },
  'natural_language_search': { tier: 'large-context', hasPII: true },
  'search_essays_nlp': { tier: 'large-context', hasPII: true },

  // ===== COMPLEX / HIGH REASONING =====
  'generate_recommendation_letter': { tier: 'high-reasoning', hasPII: true },
  'college_recommendations': { tier: 'high-reasoning', hasPII: true },
  'smart_task_creator': { tier: 'high-reasoning', hasPII: false },
  'track_application_progress': { tier: 'high-reasoning', hasPII: true },
  'ai_essay_suggestions': { tier: 'high-reasoning', hasPII: true },

  // ===== CRUD (SECURE REQUIRED) =====
  'create_essay': { tier: 'secure-private', hasPII: true },
  'update_essay_content': { tier: 'secure-private', hasPII: true },
  'delete_essay': { tier: 'secure-private', hasPII: true },
  'create_student': { tier: 'secure-private', hasPII: true },
  'update_student': { tier: 'secure-private', hasPII: true },
  'delete_student': { tier: 'secure-private', hasPII: true },
};

// ============================================================================
// Model Selection Logic
// ============================================================================

/**
 * Detects if a tool accesses PII based on tool name
 */
export function detectPII(toolName?: string): boolean {
  if (!toolName) return false;

  const toolConfig = TOOL_TO_TIER_MAP[toolName];
  if (toolConfig) {
    return toolConfig.hasPII;
  }

  // Conservative default: assume PII if tool contains these keywords
  const piiKeywords = ['student', 'essay', 'transcript', 'lor', 'recommendation'];
  return piiKeywords.some(keyword => toolName.toLowerCase().includes(keyword));
}

/**
 * Determines task complexity based on context
 */
export function detectComplexity(context: ModelSelectionContext): TaskComplexity {
  // Explicit complexity provided
  if (context.complexity) {
    return context.complexity;
  }

  // Infer from tool name
  if (context.toolName) {
    const toolConfig = TOOL_TO_TIER_MAP[context.toolName];
    if (toolConfig) {
      if (toolConfig.tier === 'fast-cheap') return 'simple';
      if (toolConfig.tier === 'large-context') return 'moderate';
      if (toolConfig.tier === 'high-reasoning' || toolConfig.tier === 'secure-private') return 'complex';
    }
  }

  // Infer from task type
  if (context.taskType === 'query') return 'simple';
  if (context.taskType === 'interactive' || context.taskType === 'analysis') return 'moderate';
  if (context.taskType === 'generation') return 'complex';

  // Conservative default
  return 'moderate';
}

/**
 * Selects the optimal model configuration based on context
 */
export function selectOptimalModel(context: ModelSelectionContext): ModelConfig {
  // Step 1: Detect PII (overrides everything)
  const hasPII = context.hasPII !== undefined
    ? context.hasPII
    : detectPII(context.toolName);

  // Step 2: If PII detected, MUST use FERPA-compliant model
  if (hasPII) {
    console.log(`[Model Router] PII detected. Forcing FERPA-compliant model.`);

    // Return the best secure model
    const secureModel = SECURE_PRIVATE_MODELS.find(m =>
      !context.preferredProvider || m.provider === context.preferredProvider
    ) || SECURE_PRIVATE_MODELS[0];

    return secureModel;
  }

  // Step 3: Determine required tier
  let requiredTier: ModelTier;

  if (context.toolName && TOOL_TO_TIER_MAP[context.toolName]) {
    requiredTier = TOOL_TO_TIER_MAP[context.toolName].tier;
  } else {
    // Infer tier from complexity
    const complexity = detectComplexity(context);
    if (complexity === 'simple') requiredTier = 'fast-cheap';
    else if (complexity === 'moderate') requiredTier = 'large-context';
    else requiredTier = 'high-reasoning';
  }

  console.log(`[Model Router] Tool: ${context.toolName || 'unknown'}, Tier: ${requiredTier}`);

  // Step 4: Select model pool based on tier
  let modelPool: ModelConfig[];
  switch (requiredTier) {
    case 'fast-cheap':
      modelPool = FAST_CHEAP_MODELS;
      break;
    case 'large-context':
      modelPool = LARGE_CONTEXT_MODELS;
      break;
    case 'high-reasoning':
      modelPool = HIGH_REASONING_MODELS;
      break;
    case 'secure-private':
      modelPool = SECURE_PRIVATE_MODELS;
      break;
    default:
      modelPool = LARGE_CONTEXT_MODELS; // Safe default
  }

  // Step 5: Filter by provider preference and constraints
  let filteredModels = modelPool.filter(model => {
    // Provider preference
    if (context.preferredProvider && model.provider !== context.preferredProvider) {
      return false;
    }

    // Allowed providers list
    if (context.allowedProviders && !context.allowedProviders.includes(model.provider)) {
      return false;
    }

    // Cost constraint
    if (context.maxCostPerRequest && model.estimatedCost > context.maxCostPerRequest) {
      return false;
    }

    // Performance constraint
    if (context.maxResponseTime && model.estimatedResponseTime > context.maxResponseTime) {
      return false;
    }

    return true;
  });

  // Step 6: Select best model from filtered pool
  if (filteredModels.length === 0) {
    console.warn(`[Model Router] No models match constraints. Falling back to default.`);
    filteredModels = modelPool;
  }

  // Prefer FERPA-compliant if multiple options
  const ferpaCompliant = filteredModels.find(m => m.isFERPACompliant);
  if (ferpaCompliant) {
    console.log(`[Model Router] Selected: ${ferpaCompliant.provider}/${ferpaCompliant.modelName} (FERPA)`);
    return ferpaCompliant;
  }

  // Otherwise, return first match (cheapest/fastest)
  const selected = filteredModels[0];
  console.log(`[Model Router] Selected: ${selected.provider}/${selected.modelName} ($${selected.estimatedCost})`);
  return selected;
}

/**
 * Helper function to get recommended model for a specific tool
 */
export function getModelForTool(toolName: string, preferredProvider?: AIProvider): ModelConfig {
  return selectOptimalModel({
    toolName,
    preferredProvider,
  });
}

/**
 * Helper function to get recommended model for chatbot conversations
 */
export function getModelForChatbot(hasPII: boolean = true): ModelConfig {
  return selectOptimalModel({
    taskType: 'interactive',
    complexity: 'moderate',
    hasPII, // Chatbots often discuss student data
    requiresLargeContext: true,
  });
}

/**
 * Cost estimation helper
 */
export function estimateCostSavings(
  toolName: string,
  requestsPerDay: number
): { oldCost: number; newCost: number; savingsPercent: number } {
  // Assume old system always used gpt-4o at $0.002/request
  const oldCostPerRequest = 0.002;
  const oldCost = oldCostPerRequest * requestsPerDay;

  // Get new model cost
  const newModel = getModelForTool(toolName);
  const newCost = newModel.estimatedCost * requestsPerDay;

  const savingsPercent = ((oldCost - newCost) / oldCost) * 100;

  return {
    oldCost,
    newCost,
    savingsPercent: Math.max(0, savingsPercent), // No negative savings
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  TOOL_TO_TIER_MAP,
  FAST_CHEAP_MODELS,
  LARGE_CONTEXT_MODELS,
  HIGH_REASONING_MODELS,
  SECURE_PRIVATE_MODELS,
};
