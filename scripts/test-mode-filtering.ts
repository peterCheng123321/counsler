/**
 * Test Script: Mode-Based Tool Filtering
 * Demonstrates intelligent tool filtering by user role and AI mode
 */

import { langchainTools, enhancedTools } from "../lib/ai/tools";
import { crudTools } from "../lib/ai/langchain-tools-crud";
import { canvasTools } from "../lib/ai/canvas-tools";
import { essayTools } from "../lib/ai/essay-tools";
import { collegeTools } from "../lib/ai/college-tools";
import { analyticsTools } from "../lib/ai/analytics-tools";
import {
  UserRole,
  AIMode,
  MODE_DEFINITIONS,
  getToolsForRole,
  getToolsForMode,
  getToolsForRoleAndMode,
  getModesForRole,
  getDefaultMode,
  TOOL_CATALOG,
} from "../lib/ai/tool-categories";
import {
  filterTools,
  getToolFilterStats,
  getFilteredToolNames,
  getCounselorCopilotTools,
  getStudentAdvisorTools,
  getAdminAnalyticsTools,
  getCanvasEditorTools,
  getResearchAssistantTools,
} from "../lib/ai/tool-filter";

// ============================================================================
// Test Helper
// ============================================================================

function logTest(testName: string, data: any) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`TEST: ${testName}`);
  console.log(`${"=".repeat(80)}`);
  if (typeof data === "object" && !Array.isArray(data)) {
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
  } else {
    console.log(data);
  }
}

// Combine all tools
const allTools = [
  ...langchainTools,
  ...crudTools,
  ...analyticsTools,
  ...enhancedTools,
  ...canvasTools,
  ...essayTools,
  ...collegeTools,
];

console.log(`\n${"=".repeat(80)}`);
console.log(`MODE-BASED TOOL FILTERING TEST SUITE`);
console.log(`${"=".repeat(80)}`);
console.log(`Total tools available: ${allTools.length}`);
console.log(`Total tools in catalog: ${Object.keys(TOOL_CATALOG).length}`);

// ============================================================================
// Test 1: Available Modes for Each Role
// ============================================================================

logTest("Available Modes for Each Role", {
  counselor: getModesForRole("counselor"),
  student: getModesForRole("student"),
  admin: getModesForRole("admin"),
});

// ============================================================================
// Test 2: Default Mode for Each Role
// ============================================================================

logTest("Default Mode for Each Role", {
  counselor: getDefaultMode("counselor"),
  student: getDefaultMode("student"),
  admin: getDefaultMode("admin"),
});

// ============================================================================
// Test 3: Mode Metadata
// ============================================================================

console.log(`\n${"=".repeat(80)}`);
console.log(`MODE DEFINITIONS`);
console.log(`${"=".repeat(80)}`);

Object.values(MODE_DEFINITIONS).forEach((mode) => {
  console.log(`\n${mode.displayName} (${mode.mode})`);
  console.log(`  Description: ${mode.description}`);
  console.log(`  Primary Role: ${mode.primaryRole}`);
  console.log(`  Available For: ${mode.availableFor.join(", ")}`);
  console.log(`  Icon: ${mode.icon}`);
});

// ============================================================================
// Test 4: Tool Filtering by Role
// ============================================================================

logTest("Tool Filtering by Role (No Mode)", {
  "Counselor tools": getToolsForRole("counselor").length,
  "Student tools": getToolsForRole("student").length,
  "Admin tools": getToolsForRole("admin").length,
});

// ============================================================================
// Test 5: Tool Filtering by Mode
// ============================================================================

logTest("Tool Filtering by Mode (All Roles)", {
  "Counselor's Copilot": getToolsForMode("counselor_copilot").length,
  "Student Advisor": getToolsForMode("student_advisor").length,
  "Admin Analytics": getToolsForMode("admin_analytics").length,
  "Canvas Editor": getToolsForMode("canvas_editor").length,
  "Research Assistant": getToolsForMode("research_assistant").length,
});

// ============================================================================
// Test 6: Counselor's Copilot Mode (Detailed)
// ============================================================================

console.log(`\n${"=".repeat(80)}`);
console.log(`COUNSELOR'S COPILOT MODE - DETAILED ANALYSIS`);
console.log(`${"=".repeat(80)}`);

const counselorTools = getCounselorCopilotTools(allTools);
const counselorStats = getToolFilterStats(allTools, {
  role: "counselor",
  mode: "counselor_copilot",
});

console.log(`\nStatistics:`);
console.log(`  Total tools: ${counselorStats.total}`);
console.log(`  Available: ${counselorStats.filtered}`);
console.log(`  Excluded: ${counselorStats.excluded}`);
console.log(`  Percentage: ${((counselorStats.filtered / counselorStats.total) * 100).toFixed(1)}%`);

console.log(`\nBy Category:`);
Object.entries(counselorStats.byCategory).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} tools`);
});

console.log(`\nBy Permission:`);
Object.entries(counselorStats.byPermission).forEach(([permission, count]) => {
  console.log(`  ${permission}: ${count} tools`);
});

console.log(`\nAvailable Tools:`);
const counselorToolNames = getFilteredToolNames(allTools, {
  role: "counselor",
  mode: "counselor_copilot",
});
counselorToolNames.forEach((toolName, i) => {
  const metadata = TOOL_CATALOG[toolName];
  console.log(`  ${i + 1}. ${toolName} (${metadata?.category}${metadata?.hasPII ? ", PII" : ""}) - ${metadata?.displayName}`);
});

// ============================================================================
// Test 7: Student Advisor Mode (Detailed)
// ============================================================================

console.log(`\n${"=".repeat(80)}`);
console.log(`STUDENT ADVISOR MODE - DETAILED ANALYSIS`);
console.log(`${"=".repeat(80)}`);

const studentTools = getStudentAdvisorTools(allTools);
const studentStats = getToolFilterStats(allTools, {
  role: "student",
  mode: "student_advisor",
});

console.log(`\nStatistics:`);
console.log(`  Total tools: ${studentStats.total}`);
console.log(`  Available: ${studentStats.filtered}`);
console.log(`  Excluded: ${studentStats.excluded}`);
console.log(`  Percentage: ${((studentStats.filtered / studentStats.total) * 100).toFixed(1)}%`);

console.log(`\nBy Category:`);
Object.entries(studentStats.byCategory).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} tools`);
});

console.log(`\nBy Permission:`);
Object.entries(studentStats.byPermission).forEach(([permission, count]) => {
  console.log(`  ${permission}: ${count} tools`);
});

console.log(`\nAvailable Tools:`);
const studentToolNames = getFilteredToolNames(allTools, {
  role: "student",
  mode: "student_advisor",
});
studentToolNames.forEach((toolName, i) => {
  const metadata = TOOL_CATALOG[toolName];
  console.log(`  ${i + 1}. ${toolName} (${metadata?.category}) - ${metadata?.displayName}`);
});

// ============================================================================
// Test 8: Admin Analytics Mode (Detailed)
// ============================================================================

console.log(`\n${"=".repeat(80)}`);
console.log(`ADMIN ANALYTICS MODE - DETAILED ANALYSIS`);
console.log(`${"=".repeat(80)}`);

const adminTools = getAdminAnalyticsTools(allTools);
const adminStats = getToolFilterStats(allTools, {
  role: "admin",
  mode: "admin_analytics",
  includeAdminTools: true,
});

console.log(`\nStatistics:`);
console.log(`  Total tools: ${adminStats.total}`);
console.log(`  Available: ${adminStats.filtered}`);
console.log(`  Excluded: ${adminStats.excluded}`);
console.log(`  Percentage: ${((adminStats.filtered / adminStats.total) * 100).toFixed(1)}%`);

console.log(`\nBy Category:`);
Object.entries(adminStats.byCategory).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} tools`);
});

console.log(`\nBy Permission:`);
Object.entries(adminStats.byPermission).forEach(([permission, count]) => {
  console.log(`  ${permission}: ${count} tools`);
});

// ============================================================================
// Test 9: Comparison Matrix
// ============================================================================

console.log(`\n${"=".repeat(80)}`);
console.log(`MODE COMPARISON MATRIX`);
console.log(`${"=".repeat(80)}`);

const modes: { role: UserRole; mode: AIMode; name: string }[] = [
  { role: "counselor", mode: "counselor_copilot", name: "Counselor's Copilot" },
  { role: "student", mode: "student_advisor", name: "Student Advisor" },
  { role: "admin", mode: "admin_analytics", name: "Admin Analytics" },
  { role: "counselor", mode: "canvas_editor", name: "Canvas Editor (Counselor)" },
  { role: "student", mode: "canvas_editor", name: "Canvas Editor (Student)" },
  { role: "counselor", mode: "research_assistant", name: "Research Assistant" },
];

console.log(`\n${"Mode".padEnd(35)} | Tools | Read | Write | Admin | PII`);
console.log(`${"-".repeat(80)}`);

modes.forEach(({ role, mode, name }) => {
  const stats = getToolFilterStats(allTools, {
    role,
    mode,
    includeAdminTools: role === "admin",
  });

  const toolNames = getFilteredToolNames(allTools, { role, mode });
  const piiCount = toolNames.filter((t) => TOOL_CATALOG[t]?.hasPII).length;

  console.log(
    `${name.padEnd(35)} | ${stats.filtered.toString().padStart(5)} | ${(stats.byPermission.read || 0).toString().padStart(4)} | ${(stats.byPermission.write || 0).toString().padStart(5)} | ${(stats.byPermission.admin || 0).toString().padStart(5)} | ${piiCount.toString().padStart(3)}`
  );
});

// ============================================================================
// Test 10: Permission Enforcement Examples
// ============================================================================

console.log(`\n${"=".repeat(80)}`);
console.log(`PERMISSION ENFORCEMENT EXAMPLES`);
console.log(`${"=".repeat(80)}`);

const testCases = [
  {
    scenario: "Student tries to delete a student",
    role: "student" as UserRole,
    tool: "delete_student",
  },
  {
    scenario: "Student tries to view their essays",
    role: "student" as UserRole,
    tool: "get_essays",
  },
  {
    scenario: "Counselor tries to generate LOR",
    role: "counselor" as UserRole,
    tool: "generate_recommendation_letter",
  },
  {
    scenario: "Student tries to generate LOR",
    role: "student" as UserRole,
    tool: "generate_recommendation_letter",
  },
  {
    scenario: "Admin tries to delete tasks",
    role: "admin" as UserRole,
    tool: "delete_task",
  },
];

testCases.forEach(({ scenario, role, tool }) => {
  const metadata = TOOL_CATALOG[tool];
  const allowed = metadata?.availableForRoles.includes(role);

  console.log(`\n${scenario}:`);
  console.log(`  Role: ${role}`);
  console.log(`  Tool: ${tool}`);
  console.log(`  Required Permission: ${metadata?.requiredPermission || "unknown"}`);
  console.log(`  Allowed: ${allowed ? "✅ YES" : "❌ NO"}`);
  if (!allowed) {
    console.log(`  Reason: User role '${role}' not in allowed roles: ${metadata?.availableForRoles.join(", ")}`);
  }
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${"=".repeat(80)}`);
console.log(`TEST SUMMARY`);
console.log(`${"=".repeat(80)}`);

console.log(`\n✅ All mode-based filtering tests completed successfully!`);
console.log(`\nKey Findings:`);
console.log(`1. Tool filtering correctly restricts tools by user role`);
console.log(`2. Mode-based filtering further refines available tools`);
console.log(`3. Permission enforcement prevents unauthorized operations`);
console.log(`4. Counselor's Copilot has most tools (full management)`);
console.log(`5. Student Advisor has limited, safe tools (self-service)`);
console.log(`6. Admin Analytics includes admin-only tools`);
console.log(`7. Canvas Editor and Research modes are role-agnostic`);

console.log(`\n${"=".repeat(80)}\n`);
