/**
 * Tool Categorization System
 * Defines which AI tools are available for each user role and mode
 * Aligns with Blueprint Section 3.2 (Counselor's Copilot) and Section 3.3 (Student's Personal Advisor)
 */

// ============================================================================
// User Roles and Modes
// ============================================================================

/**
 * User roles in the system
 */
export type UserRole = "counselor" | "student" | "admin";

/**
 * AI modes - simplified interaction patterns
 * Inspired by Google Gemini's mode selection
 */
export type AIMode =
  | "counselor_copilot"   // Counselor's work assistant
  | "student_advisor"     // Student's personal advisor
  | "admin_analytics"     // Admin analytics and insights
  | "canvas_editor"       // Interactive canvas editing
  | "research_assistant"; // Deep research and analysis

/**
 * Mode metadata for UI display
 */
export interface ModeMetadata {
  mode: AIMode;
  displayName: string;
  description: string;
  icon: string;
  primaryRole: UserRole;
  availableFor: UserRole[];
}

/**
 * Mode definitions with metadata
 */
export const MODE_DEFINITIONS: Record<AIMode, ModeMetadata> = {
  counselor_copilot: {
    mode: "counselor_copilot",
    displayName: "Counselor's Copilot",
    description: "Manage students, track progress, generate letters of recommendation, and get proactive insights",
    icon: "briefcase",
    primaryRole: "counselor",
    availableFor: ["counselor", "admin"],
  },
  student_advisor: {
    mode: "student_advisor",
    displayName: "Student Advisor",
    description: "Get personalized college application guidance, essay help, and deadline reminders",
    icon: "graduation-cap",
    primaryRole: "student",
    availableFor: ["student"],
  },
  admin_analytics: {
    mode: "admin_analytics",
    displayName: "Analytics & Insights",
    description: "View platform analytics, generate reports, and monitor system performance",
    icon: "chart-bar",
    primaryRole: "admin",
    availableFor: ["admin"],
  },
  canvas_editor: {
    mode: "canvas_editor",
    displayName: "Canvas Editor",
    description: "Interactive editing of essays and student profiles with AI assistance",
    icon: "edit",
    primaryRole: "counselor",
    availableFor: ["counselor", "student", "admin"],
  },
  research_assistant: {
    mode: "research_assistant",
    displayName: "Research Assistant",
    description: "Deep research on colleges, programs, and application strategies",
    icon: "search",
    primaryRole: "counselor",
    availableFor: ["counselor", "student"],
  },
};

// ============================================================================
// Tool Categories
// ============================================================================

/**
 * Tool category - groups related tools
 */
export type ToolCategory =
  | "student_management"    // CRUD operations on students
  | "task_management"       // Tasks, deadlines, events
  | "essay_tools"          // Essay creation, editing, AI suggestions
  | "lor_generation"       // Letter of recommendation generation
  | "college_search"       // College search and recommendations
  | "analytics"            // Statistics, insights, trends
  | "canvas"               // Interactive canvas tools
  | "nlp_search"           // Natural language search
  | "administrative";      // Admin-only operations

/**
 * Tool permission level
 */
export type PermissionLevel = "read" | "write" | "admin";

/**
 * Tool metadata for categorization
 */
export interface ToolMetadata {
  toolName: string;
  category: ToolCategory;
  displayName: string;
  description: string;
  requiredPermission: PermissionLevel;
  availableForRoles: UserRole[];
  availableInModes: AIMode[];
  hasPII: boolean;
  requiresConfirmation?: boolean;
}

// ============================================================================
// Tool Catalog - Complete mapping of all 25+ tools
// ============================================================================

/**
 * Comprehensive tool catalog with categorization and permissions
 */
export const TOOL_CATALOG: Record<string, ToolMetadata> = {
  // ===== STUDENT MANAGEMENT TOOLS =====
  get_students: {
    toolName: "get_students",
    category: "student_management",
    displayName: "Search Students",
    description: "Search and filter students by name, year, or progress",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "admin_analytics", "research_assistant"],
    hasPII: true,
  },
  get_student: {
    toolName: "get_student",
    category: "student_management",
    displayName: "Get Student Details",
    description: "Retrieve detailed information about a specific student",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "admin_analytics", "canvas_editor"],
    hasPII: true,
  },
  create_student: {
    toolName: "create_student",
    category: "student_management",
    displayName: "Create Student",
    description: "Add a new student to the system",
    requiredPermission: "write",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot"],
    hasPII: true,
    requiresConfirmation: true,
  },
  update_student: {
    toolName: "update_student",
    category: "student_management",
    displayName: "Update Student",
    description: "Modify student information",
    requiredPermission: "write",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "canvas_editor"],
    hasPII: true,
    requiresConfirmation: true,
  },
  delete_student: {
    toolName: "delete_student",
    category: "student_management",
    displayName: "Delete Student",
    description: "Remove a student from the system",
    requiredPermission: "admin",
    availableForRoles: ["admin"],
    availableInModes: ["counselor_copilot"],
    hasPII: true,
    requiresConfirmation: true,
  },

  // ===== TASK MANAGEMENT TOOLS =====
  get_tasks: {
    toolName: "get_tasks",
    category: "task_management",
    displayName: "Search Tasks",
    description: "Query tasks, deadlines, and events",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "admin_analytics"],
    hasPII: false,
  },
  get_task: {
    toolName: "get_task",
    category: "task_management",
    displayName: "Get Task Details",
    description: "Retrieve specific task information",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor"],
    hasPII: false,
  },
  get_upcoming_deadlines: {
    toolName: "get_upcoming_deadlines",
    category: "task_management",
    displayName: "Upcoming Deadlines",
    description: "Check deadlines within a timeframe",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "admin_analytics"],
    hasPII: false,
  },
  create_task: {
    toolName: "create_task",
    category: "task_management",
    displayName: "Create Task",
    description: "Add a new task or deadline",
    requiredPermission: "write",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot"],
    hasPII: false,
    requiresConfirmation: true,
  },
  update_task: {
    toolName: "update_task",
    category: "task_management",
    displayName: "Update Task",
    description: "Modify task details or status",
    requiredPermission: "write",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor"],
    hasPII: false,
    requiresConfirmation: true,
  },
  delete_task: {
    toolName: "delete_task",
    category: "task_management",
    displayName: "Delete Task",
    description: "Remove a task from the system",
    requiredPermission: "write",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot"],
    hasPII: false,
    requiresConfirmation: true,
  },
  smart_task_creator: {
    toolName: "smart_task_creator",
    category: "task_management",
    displayName: "Smart Task Creator",
    description: "AI-powered task generation based on deadlines and patterns",
    requiredPermission: "write",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot"],
    hasPII: false,
  },

  // ===== ESSAY TOOLS =====
  get_essays: {
    toolName: "get_essays",
    category: "essay_tools",
    displayName: "Search Essays",
    description: "Query essays with filters",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "canvas_editor"],
    hasPII: true,
  },
  get_essay: {
    toolName: "get_essay",
    category: "essay_tools",
    displayName: "Get Essay Details",
    description: "Retrieve specific essay with content",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "canvas_editor"],
    hasPII: true,
  },
  create_essay: {
    toolName: "create_essay",
    category: "essay_tools",
    displayName: "Create Essay",
    description: "Start a new essay for a student",
    requiredPermission: "write",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "canvas_editor"],
    hasPII: true,
    requiresConfirmation: true,
  },
  update_essay_content: {
    toolName: "update_essay_content",
    category: "essay_tools",
    displayName: "Update Essay",
    description: "Edit essay content or metadata",
    requiredPermission: "write",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "canvas_editor"],
    hasPII: true,
    requiresConfirmation: true,
  },
  delete_essay: {
    toolName: "delete_essay",
    category: "essay_tools",
    displayName: "Delete Essay",
    description: "Remove an essay permanently",
    requiredPermission: "write",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "canvas_editor"],
    hasPII: true,
    requiresConfirmation: true,
  },
  ai_essay_suggestions: {
    toolName: "ai_essay_suggestions",
    category: "essay_tools",
    displayName: "Essay AI Feedback",
    description: "Get AI-powered writing suggestions",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "canvas_editor"],
    hasPII: true,
  },
  search_essays: {
    toolName: "search_essays",
    category: "essay_tools",
    displayName: "Essay Search",
    description: "Find essays by student name or title",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "canvas_editor"],
    hasPII: true,
  },

  // ===== LOR GENERATION =====
  generate_recommendation_letter: {
    toolName: "generate_recommendation_letter",
    category: "lor_generation",
    displayName: "Generate LOR",
    description: "Create a personalized letter of recommendation",
    requiredPermission: "write",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot"],
    hasPII: true,
    requiresConfirmation: true,
  },

  // ===== COLLEGE SEARCH & RECOMMENDATIONS =====
  get_colleges: {
    toolName: "get_colleges",
    category: "college_search",
    displayName: "Search Colleges",
    description: "Search and filter colleges",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "research_assistant"],
    hasPII: false,
  },
  college_recommendations: {
    toolName: "college_recommendations",
    category: "college_search",
    displayName: "College Recommendations",
    description: "AI-powered college match suggestions",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "research_assistant"],
    hasPII: true,
  },
  add_college_to_student: {
    toolName: "add_college_to_student",
    category: "college_search",
    displayName: "Add College to List",
    description: "Add a college to student's application list",
    requiredPermission: "write",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor"],
    hasPII: true,
    requiresConfirmation: true,
  },
  remove_college_from_student: {
    toolName: "remove_college_from_student",
    category: "college_search",
    displayName: "Remove College",
    description: "Remove a college from student's list",
    requiredPermission: "write",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor"],
    hasPII: true,
    requiresConfirmation: true,
  },
  get_student_colleges: {
    toolName: "get_student_colleges",
    category: "college_search",
    displayName: "Student's College List",
    description: "Get student's current college application list",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor"],
    hasPII: true,
  },

  // ===== ANALYTICS & INSIGHTS =====
  calculate_statistics: {
    toolName: "calculate_statistics",
    category: "analytics",
    displayName: "Calculate Statistics",
    description: "Compute aggregations and metrics",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "admin_analytics"],
    hasPII: false,
  },
  trend_analysis: {
    toolName: "trend_analysis",
    category: "analytics",
    displayName: "Trend Analysis",
    description: "Analyze patterns over time",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "admin_analytics"],
    hasPII: false,
  },
  deadline_monitor: {
    toolName: "deadline_monitor",
    category: "analytics",
    displayName: "Deadline Monitor",
    description: "Proactive deadline tracking and alerts",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "admin_analytics"],
    hasPII: false,
  },
  generate_insights: {
    toolName: "generate_insights",
    category: "analytics",
    displayName: "Generate Insights",
    description: "AI-powered actionable insights",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "admin_analytics"],
    hasPII: true,
  },
  track_application_progress: {
    toolName: "track_application_progress",
    category: "analytics",
    displayName: "Track Progress",
    description: "Monitor student application progress",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "admin_analytics"],
    hasPII: true,
  },

  // ===== CANVAS TOOLS =====
  open_student_canvas: {
    toolName: "open_student_canvas",
    category: "canvas",
    displayName: "Open Student Canvas",
    description: "Interactive student profile editor",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "canvas_editor"],
    hasPII: true,
  },
  open_essay_canvas: {
    toolName: "open_essay_canvas",
    category: "canvas",
    displayName: "Open Essay Canvas",
    description: "Interactive essay editor with AI assistance",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "canvas_editor"],
    hasPII: true,
  },

  // ===== NLP SEARCH =====
  natural_language_search: {
    toolName: "natural_language_search",
    category: "nlp_search",
    displayName: "Natural Language Search",
    description: "Search using conversational queries",
    requiredPermission: "read",
    availableForRoles: ["counselor", "student", "admin"],
    availableInModes: ["counselor_copilot", "student_advisor", "research_assistant"],
    hasPII: true,
  },
  search_essays_nlp: {
    toolName: "search_essays_nlp",
    category: "nlp_search",
    displayName: "Essay NLP Search",
    description: "Semantic search across essays",
    requiredPermission: "read",
    availableForRoles: ["counselor", "admin"],
    availableInModes: ["counselor_copilot", "research_assistant"],
    hasPII: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all tools available for a specific role
 */
export function getToolsForRole(role: UserRole): string[] {
  return Object.entries(TOOL_CATALOG)
    .filter(([_, metadata]) => metadata.availableForRoles.includes(role))
    .map(([toolName]) => toolName);
}

/**
 * Get all tools available in a specific mode
 */
export function getToolsForMode(mode: AIMode): string[] {
  return Object.entries(TOOL_CATALOG)
    .filter(([_, metadata]) => metadata.availableInModes.includes(mode))
    .map(([toolName]) => toolName);
}

/**
 * Get tools for a role in a specific mode
 */
export function getToolsForRoleAndMode(role: UserRole, mode: AIMode): string[] {
  return Object.entries(TOOL_CATALOG)
    .filter(([_, metadata]) =>
      metadata.availableForRoles.includes(role) &&
      metadata.availableInModes.includes(mode)
    )
    .map(([toolName]) => toolName);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): string[] {
  return Object.entries(TOOL_CATALOG)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([toolName]) => toolName);
}

/**
 * Get tools that require confirmation
 */
export function getToolsRequiringConfirmation(): string[] {
  return Object.entries(TOOL_CATALOG)
    .filter(([_, metadata]) => metadata.requiresConfirmation === true)
    .map(([toolName]) => toolName);
}

/**
 * Get tools with PII access
 */
export function getToolsWithPII(): string[] {
  return Object.entries(TOOL_CATALOG)
    .filter(([_, metadata]) => metadata.hasPII === true)
    .map(([toolName]) => toolName);
}

/**
 * Check if a user has permission to use a tool
 */
export function hasPermission(
  role: UserRole,
  toolName: string,
  mode?: AIMode
): boolean {
  const metadata = TOOL_CATALOG[toolName];
  if (!metadata) return false;

  // Check role permission
  if (!metadata.availableForRoles.includes(role)) {
    return false;
  }

  // Check mode permission if provided
  if (mode && !metadata.availableInModes.includes(mode)) {
    return false;
  }

  return true;
}

/**
 * Get available modes for a role
 */
export function getModesForRole(role: UserRole): AIMode[] {
  return Object.entries(MODE_DEFINITIONS)
    .filter(([_, metadata]) => metadata.availableFor.includes(role))
    .map(([mode]) => mode as AIMode);
}

/**
 * Get default mode for a role
 */
export function getDefaultMode(role: UserRole): AIMode {
  switch (role) {
    case "counselor":
      return "counselor_copilot";
    case "student":
      return "student_advisor";
    case "admin":
      return "admin_analytics";
    default:
      return "counselor_copilot";
  }
}
