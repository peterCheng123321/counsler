# Canvas Opening Fix - CRITICAL Issue Resolved

## Problem Identified

**Issue:** LLM was unable to open canvas when users requested to view student profiles or essays.

**Root Cause:** Canvas tools (`open_student_canvas`, `open_essay_canvas`, `search_essays`, `update_essay_content`) were defined in `lib/ai/canvas-tools.ts` but **never registered with the LLM agents**.

### What Was Broken:

1. **langchain-agent.ts** - Did not import or include canvas tools
2. **langgraph-agent.ts** - Did not import or include canvas tools
3. System prompts did not mention canvas tools or when to use them
4. LLM had no knowledge that canvas functionality existed

### User Request:
> "there is a fundamental problem, is that LLM should know when to open and close canvas, but right now it doesn't, you need to check that, specifically on how the langchain and longgraph been called"

---

## Investigation Process

### 1. Examined Agent Files

**langchain-agent.ts (lines 7-8, 84):**
```typescript
import { langchainTools, enhancedTools } from "./tools";
import { crudTools } from "./langchain-tools-crud";
// ❌ Missing: import { canvasTools } from "./canvas-tools";

const allTools = [...langchainTools, ...crudTools, ...enhancedTools];
// ❌ Missing: canvasTools
```

**langgraph-agent.ts (lines 9-11, 93):**
```typescript
import { langchainTools, enhancedTools } from "./tools";
import { crudTools } from "./langchain-tools-crud";
import { analyticsTools } from "./analytics-tools";
// ❌ Missing: import { canvasTools } from "./canvas-tools";

const allTools = [...langchainTools, ...crudTools, ...analyticsTools, ...enhancedTools];
// ❌ Missing: canvasTools
```

### 2. Verified Canvas Tools Exist

**lib/ai/canvas-tools.ts** - File contains 4 tools:
- `openEssayCanvasTool` - Opens essay in interactive editor
- `searchEssaysTool` - Finds essays by student name or title
- `updateEssayContentTool` - Updates essay content/metadata
- `openStudentCanvasTool` - Opens student profile in interactive editor

All tools properly defined with Zod schemas and return `__canvas__` markers, but **never accessible to LLM**.

### 3. Checked Canvas Detection Logic

**app/(app)/chatbot/page.tsx (lines 327-347):**
```typescript
// Canvas detection works by detecting tool call name
if (toolName === "open_essay_canvas" && args.essay_id) {
  setCanvasData({
    type: "essay",
    essayId: args.essay_id,
    studentId: args.student_id || null,
    isExpanded: false,
  });
  toast.success("Opening essay in editor...");
} else if (toolName === "open_student_canvas" && args.student_id) {
  setCanvasData({
    type: "student",
    essayId: null,
    studentId: args.student_id,
    isExpanded: false,
  });
  toast.success("Opening student profile...");
}
```

**Finding:** Detection logic was correct, but tools were never being called because LLM didn't have access to them!

---

## Solution Implemented

### 1. Added Canvas Tools to LangChain Agent

**File:** `lib/ai/langchain-agent.ts`

**Changes:**
```typescript
// ✅ ADDED: Import canvas tools
import { canvasTools } from "./canvas-tools";

// ✅ UPDATED: Include canvas tools in agent
const allTools = [...langchainTools, ...crudTools, ...enhancedTools, ...canvasTools];
```

### 2. Added Canvas Tools to LangGraph Agent

**File:** `lib/ai/langgraph-agent.ts`

**Changes:**
```typescript
// ✅ ADDED: Import canvas tools
import { canvasTools } from "./canvas-tools";

// ✅ UPDATED: Include canvas tools in agent
const allTools = [...langchainTools, ...crudTools, ...analyticsTools, ...enhancedTools, ...canvasTools];
```

### 3. Updated System Prompts (Both Agents)

**langchain-agent.ts - Added canvas documentation:**
```typescript
**CANVAS TOOLS** (Interactive UI):
- open_student_canvas: Open student profile in interactive editor (MUST have exact student_id UUID)
- open_essay_canvas: Open essay in interactive editor for viewing/editing
- search_essays: Find essays by student name or title (use before open_essay_canvas)

**CRITICAL Rules**:
3. Canvas tools: ALWAYS get student_id from get_students before calling open_student_canvas
4. When user says "show me [name]" or "open [name]", use canvas tools to display interactive view

**Workflow**:
- Student by name → Search with get_students, get ID, then open_student_canvas
- "Show me X" / "Open X" → Use canvas tools for interactive view
```

**langgraph-agent.ts - Added canvas documentation:**
```typescript
4. **Interactive Canvas**: Open student profiles and essays in interactive editors

**Canvas Tools (Interactive UI):**
- open_student_canvas: Open student profile in interactive editor (REQUIRES exact student_id UUID)
- open_essay_canvas: Open essay in interactive editor for viewing/editing
- search_essays: Find essays by student name or title (use before open_essay_canvas)
- update_essay_content: Update essay content/metadata (AI-assisted edits only)

4. **Use Canvas for "Show" Requests**: When user says "show me [student name]" or "open [student]":
   - First use get_students to find the student by name and get their student_id
   - Then use open_student_canvas with the exact student_id
   - NEVER guess or make up UUIDs - always search first
```

---

## How Canvas Opening Works (Now Fixed)

### Example: User says "Show me Sophia Chen"

**Before Fix:**
1. ❌ LLM tries to respond but doesn't know about canvas tools
2. ❌ Returns text description instead of opening canvas
3. ❌ User frustrated - no interactive view

**After Fix:**
1. ✅ LLM receives request "Show me Sophia Chen"
2. ✅ LLM calls `get_students` with search="Sophia Chen"
3. ✅ Receives student data including `student_id: "abc-123-def-456"`
4. ✅ LLM calls `open_student_canvas` with `student_id: "abc-123-def-456"`
5. ✅ Streaming response includes tool_call event
6. ✅ chatbot/page.tsx detects `toolName === "open_student_canvas"`
7. ✅ Extracts `args.student_id` from tool call
8. ✅ Calls `setCanvasData({ type: "student", studentId: "abc-123-def-456" })`
9. ✅ Canvas opens with Sophia Chen's profile
10. ✅ Toast notification: "Opening student profile..."

### Detection Flow

```
User Input → LLM Agent → Tool Call Detection → Canvas State Update → UI Renders Canvas
            (has tools)   (open_student_canvas)  (setCanvasData)      (StudentCanvas)
```

**Key Point:** Detection happens at the **tool call level**, not by parsing tool results. The `__canvas__` markers in tool responses are not currently used by the UI.

---

## Files Modified

### 1. lib/ai/langchain-agent.ts
- **Line 9:** Added `import { canvasTools } from "./canvas-tools";`
- **Line 85:** Updated `allTools` to include `...canvasTools`
- **Lines 19-44:** Updated SYSTEM_PROMPT to document canvas tools and workflows

### 2. lib/ai/langgraph-agent.ts
- **Line 12:** Added `import { canvasTools } from "./canvas-tools";`
- **Line 94:** Updated `allTools` to include `...canvasTools`
- **Lines 26-74:** Updated AGENT_SYSTEM_PROMPT to document canvas tools and workflows

### 3. CANVAS_OPENING_FIX.md (This Document)
- New documentation explaining the problem and solution

---

## Testing Checklist

### Manual Testing Required:

- [ ] Open chatbot page
- [ ] Type: "Show me Sophia Chen"
- [ ] Verify: Student canvas opens with Sophia Chen's profile
- [ ] Type: "Show me [any student name]"
- [ ] Verify: LLM searches for student, then opens canvas
- [ ] Type: "Open [student]'s essay"
- [ ] Verify: LLM searches for essay, then opens essay canvas
- [ ] Check console logs for:
  - `[LangChain Agent] Creating agent with X tools` (X should be higher now)
  - `[Canvas] Opening student canvas:` when canvas opens
  - Tool call events in streaming response

### Expected Console Output:

```
[LangChain Agent] Using provider: openai (gpt-4o)
[LangChain Agent] Iteration 1
[LangChain Agent] Tool calls detected: ["get_students"]
[LangChain Agent] Executing tool: get_students
[LangChain Agent] Tool get_students completed in 150ms
[LangChain Agent] Tool calls detected: ["open_student_canvas"]
[LangChain Agent] Executing tool: open_student_canvas
[Canvas] Opening student canvas: { student_id: "abc-123-def" }
[LangChain Agent] Tool open_student_canvas completed in 120ms
```

---

## Canvas Tools Documentation

### open_student_canvas

**Description:** Opens student profile in interactive canvas viewer

**Requirements:**
- Must have exact `student_id` (UUID format)
- If only student name is known, call `get_students` first to get ID

**Usage Pattern:**
```typescript
1. User: "Show me John Smith"
2. LLM calls: get_students({ search: "John Smith" })
3. LLM receives: { student_id: "abc-123" }
4. LLM calls: open_student_canvas({ student_id: "abc-123" })
5. UI opens: Student canvas with John Smith's profile
```

### open_essay_canvas

**Description:** Opens essay in interactive editor

**Requirements:**
- Must have exact `essay_id` (UUID format)
- If only essay title/student name is known, call `search_essays` first

**Usage Pattern:**
```typescript
1. User: "Show me Sarah's personal statement"
2. LLM calls: search_essays({ student_name: "Sarah", essay_title: "personal statement" })
3. LLM receives: { essay_id: "def-456" }
4. LLM calls: open_essay_canvas({ essay_id: "def-456" })
5. UI opens: Essay canvas with Sarah's personal statement
```

### search_essays

**Description:** Find essays by student name or title

**Parameters:**
- `student_name` (optional) - Student's first or last name
- `essay_title` (optional) - Essay title keywords
- `student_id` (optional) - Exact student ID if known
- `limit` (optional) - Max results (default: 10)

**Returns:** Array of essays with IDs, titles, student names

### update_essay_content

**Description:** Update essay content or metadata (AI-assisted edits only)

**Parameters:**
- `essay_id` (required) - UUID of essay
- `title` (optional) - New title
- `content` (optional) - New content
- `status` (optional) - "draft" | "in_review" | "completed"
- `feedback` (optional) - Counselor feedback

---

## Impact

### Before Fix:
- ❌ Canvas never opened for student/essay views
- ❌ LLM returned text descriptions instead
- ❌ Users had to manually navigate to view details
- ❌ Poor UX - no interactive editing

### After Fix:
- ✅ Canvas opens automatically when user says "show me [student]"
- ✅ Interactive student profile with live editing
- ✅ Interactive essay editor with real-time updates
- ✅ Seamless chatbot → canvas workflow
- ✅ LLM can intelligently decide when to use canvas vs text response

---

## Additional Notes

### Why Was This Missed?

1. Canvas tools were created in a separate file (`canvas-tools.ts`)
2. Never exported from main `tools.ts` file
3. Never imported in agent files
4. System prompts didn't mention canvas functionality
5. Detection logic in UI was correct, but tools were inaccessible

### Why Detection Works Now:

The canvas detection in `chatbot/page.tsx` works by checking the **tool call name** in streaming responses:

```typescript
if (toolName === "open_student_canvas" && args.student_id) {
  setCanvasData({ type: "student", studentId: args.student_id });
}
```

Now that the LLM has access to `open_student_canvas` and `open_essay_canvas` tools, it can call them, triggering the detection logic.

### Future Improvements (Optional):

1. **Add tool result parsing:** Check for `__canvas__` markers in tool results as backup detection method
2. **Auto-close canvas:** Detect when user moves to different topic and close canvas
3. **Canvas state persistence:** Save canvas state to sessionStorage (may already exist)
4. **Multi-canvas support:** Allow opening multiple essays/students simultaneously
5. **Canvas keyboard shortcuts:** ESC to close, Tab to navigate fields

---

**Status:** ✅ **FIXED - READY FOR TESTING**

**Breaking Changes:** None

**Backward Compatibility:** Full - existing functionality unchanged

**Performance Impact:** Minimal - adds 4 tools to agent (negligible overhead)

**Date:** November 14, 2025

**Implementation Time:** 30 minutes (investigation + fix + documentation)

**Files Changed:** 2 modified + 1 new documentation

**Lines Added:** ~60 (imports, tool arrays, prompt documentation)

**Lines Removed:** 0 (non-breaking change)
