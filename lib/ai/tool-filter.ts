/**
 * Tool Filtering System
 * Filters AI tools based on user role, mode, and permissions
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  UserRole,
  AIMode,
  getToolsForRoleAndMode,
  hasPermission,
  TOOL_CATALOG,
} from "./tool-categories";

// ============================================================================
// Tool Filtering
// ============================================================================

/**
 * Filter configuration for tool selection
 */
export interface ToolFilterConfig {
  role: UserRole;
  mode?: AIMode;
  includeAdminTools?: boolean;
  excludeWriteTools?: boolean;
  onlyReadTools?: boolean;
}

/**
 * Filter tools based on role, mode, and permissions
 */
export function filterTools(
  allTools: DynamicStructuredTool[],
  config: ToolFilterConfig
): DynamicStructuredTool[] {
  const { role, mode, includeAdminTools = false, excludeWriteTools = false, onlyReadTools = false } = config;

  return allTools.filter((tool) => {
    const toolName = tool.name;
    const metadata = TOOL_CATALOG[toolName];

    // If tool not in catalog, exclude it (safety)
    if (!metadata) {
      console.warn(`[Tool Filter] Tool "${toolName}" not found in catalog, excluding`);
      return false;
    }

    // Check basic role and mode permissions
    if (!hasPermission(role, toolName, mode)) {
      return false;
    }

    // Exclude admin tools unless explicitly included
    if (!includeAdminTools && metadata.requiredPermission === "admin") {
      return false;
    }

    // Exclude write tools if requested (read-only mode)
    if (excludeWriteTools && metadata.requiredPermission === "write") {
      return false;
    }

    // Include only read tools if requested
    if (onlyReadTools && metadata.requiredPermission !== "read") {
      return false;
    }

    return true;
  });
}

/**
 * Get filtered tool names (useful for logging and debugging)
 */
export function getFilteredToolNames(
  allTools: DynamicStructuredTool[],
  config: ToolFilterConfig
): string[] {
  return filterTools(allTools, config).map((tool) => tool.name);
}

/**
 * Get tool statistics for a filter configuration
 */
export function getToolFilterStats(
  allTools: DynamicStructuredTool[],
  config: ToolFilterConfig
): {
  total: number;
  filtered: number;
  excluded: number;
  byCategory: Record<string, number>;
  byPermission: Record<string, number>;
} {
  const filteredTools = filterTools(allTools, config);
  const filteredNames = filteredTools.map((t) => t.name);

  // Count by category
  const byCategory: Record<string, number> = {};
  const byPermission: Record<string, number> = {};

  filteredNames.forEach((toolName) => {
    const metadata = TOOL_CATALOG[toolName];
    if (metadata) {
      byCategory[metadata.category] = (byCategory[metadata.category] || 0) + 1;
      byPermission[metadata.requiredPermission] = (byPermission[metadata.requiredPermission] || 0) + 1;
    }
  });

  return {
    total: allTools.length,
    filtered: filteredTools.length,
    excluded: allTools.length - filteredTools.length,
    byCategory,
    byPermission,
  };
}

// ============================================================================
// Mode-Specific Tool Sets
// ============================================================================

/**
 * Get tools for Counselor's Copilot mode
 */
export function getCounselorCopilotTools(allTools: DynamicStructuredTool[]): DynamicStructuredTool[] {
  return filterTools(allTools, {
    role: "counselor",
    mode: "counselor_copilot",
  });
}

/**
 * Get tools for Student Advisor mode
 */
export function getStudentAdvisorTools(allTools: DynamicStructuredTool[]): DynamicStructuredTool[] {
  return filterTools(allTools, {
    role: "student",
    mode: "student_advisor",
  });
}

/**
 * Get tools for Admin Analytics mode
 */
export function getAdminAnalyticsTools(allTools: DynamicStructuredTool[]): DynamicStructuredTool[] {
  return filterTools(allTools, {
    role: "admin",
    mode: "admin_analytics",
    includeAdminTools: true,
  });
}

/**
 * Get tools for Canvas Editor mode
 */
export function getCanvasEditorTools(
  allTools: DynamicStructuredTool[],
  role: UserRole
): DynamicStructuredTool[] {
  return filterTools(allTools, {
    role,
    mode: "canvas_editor",
  });
}

/**
 * Get tools for Research Assistant mode
 */
export function getResearchAssistantTools(
  allTools: DynamicStructuredTool[],
  role: UserRole
): DynamicStructuredTool[] {
  return filterTools(allTools, {
    role,
    mode: "research_assistant",
    onlyReadTools: true, // Research is read-only
  });
}

// ============================================================================
// Logging and Debugging
// ============================================================================

/**
 * Log filtered tools for debugging
 */
export function logFilteredTools(
  allTools: DynamicStructuredTool[],
  config: ToolFilterConfig
): void {
  const stats = getToolFilterStats(allTools, config);
  const filteredNames = getFilteredToolNames(allTools, config);

  console.log(`[Tool Filter] Configuration:`, {
    role: config.role,
    mode: config.mode || "none",
    includeAdminTools: config.includeAdminTools,
    excludeWriteTools: config.excludeWriteTools,
    onlyReadTools: config.onlyReadTools,
  });

  console.log(`[Tool Filter] Statistics:`, {
    total: stats.total,
    filtered: stats.filtered,
    excluded: stats.excluded,
  });

  console.log(`[Tool Filter] By Category:`, stats.byCategory);
  console.log(`[Tool Filter] By Permission:`, stats.byPermission);
  console.log(`[Tool Filter] Filtered Tools (${stats.filtered}):`, filteredNames);
}

/**
 * Validate tool filter configuration
 */
export function validateFilterConfig(config: ToolFilterConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for conflicting options
  if (config.excludeWriteTools && config.onlyReadTools) {
    errors.push("Cannot specify both excludeWriteTools and onlyReadTools");
  }

  // Check if mode is valid for role
  if (config.mode) {
    const metadata = TOOL_CATALOG[config.mode];
    // Mode validation would go here if we had mode-specific checks
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Tool Grouping for UI
// ============================================================================

/**
 * Group tools by category for UI display
 */
export function groupToolsByCategory(
  tools: DynamicStructuredTool[]
): Record<string, DynamicStructuredTool[]> {
  const grouped: Record<string, DynamicStructuredTool[]> = {};

  tools.forEach((tool) => {
    const metadata = TOOL_CATALOG[tool.name];
    if (metadata) {
      const category = metadata.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tool);
    }
  });

  return grouped;
}

/**
 * Get tool display information for UI
 */
export function getToolDisplayInfo(toolName: string): {
  name: string;
  displayName: string;
  description: string;
  category: string;
  requiresConfirmation: boolean;
  hasPII: boolean;
} | null {
  const metadata = TOOL_CATALOG[toolName];
  if (!metadata) return null;

  return {
    name: toolName,
    displayName: metadata.displayName,
    description: metadata.description,
    category: metadata.category,
    requiresConfirmation: metadata.requiresConfirmation || false,
    hasPII: metadata.hasPII,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { filterTools as default };
