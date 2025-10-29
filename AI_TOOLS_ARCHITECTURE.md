# 🛠️ AI Tools Implementation - Complete Architecture

## Overview

The AI tools system uses **OpenAI Function Calling** to give the chatbot the ability to execute code and fetch real data. It's like giving the AI a toolkit of functions it can call when needed.

---

## 🔄 Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USER SENDS MESSAGE                                          │
│  "Analyze John's essay about robotics"                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CHATBOT RECEIVES REQUEST                                    │
│  POST /api/v1/chatbot/chat                                     │
│  - Authenticates user                                          │
│  - Loads conversation history                                  │
│  - Adds new message                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. SENDS TO OPENAI WITH TOOLS                                  │
│                                                                 │
│  aiServiceManager.chatStream(messages, {                       │
│    systemPrompt: "You are a college counseling assistant...",  │
│    tools: aiTools  // ALL 21 TOOL DEFINITIONS                  │
│  })                                                             │
│                                                                 │
│  OpenAI receives:                                               │
│  - Conversation history                                         │
│  - Current message                                              │
│  - System prompt (instructions)                                 │
│  - 21 tool definitions (function signatures)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. OPENAI ANALYZES & DECIDES                                   │
│                                                                 │
│  OpenAI GPT-4o-mini reads message and thinks:                  │
│  "User wants to analyze an essay. I should use the             │
│   'analyze_essay' tool that was provided."                     │
│                                                                 │
│  Decision: CALL TOOL                                            │
│  Tool: "analyze_essay"                                          │
│  Arguments: { essayContent: "..." }                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. CHATBOT RECEIVES TOOL CALL                                  │
│                                                                 │
│  Stream chunk: {                                                │
│    type: "tool_call",                                           │
│    toolCall: {                                                  │
│      id: "call_abc123",                                         │
│      name: "analyze_essay",                                     │
│      arguments: "{\"essayContent\":\"...\"}"                    │
│    }                                                            │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. EXECUTE TOOL                                                │
│                                                                 │
│  executeTool(toolCall, userId) {                               │
│    switch (toolCall.name) {                                    │
│      case "analyze_essay":                                     │
│        // Parse arguments                                      │
│        const { essayContent } = JSON.parse(args)               │
│                                                                │
│        // Call intelligence module                             │
│        const analysis = await analyzeEssay(essayContent)       │
│                                                                │
│        // Return result                                        │
│        return {                                                │
│          toolCallId: toolCall.id,                              │
│          name: "analyze_essay",                                │
│          result: analysis  // Essay scores, feedback, etc.     │
│        }                                                       │
│    }                                                           │
│  }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. SEND RESULT BACK TO OPENAI                                  │
│                                                                 │
│  New messages added to conversation:                            │
│  1. Assistant message with tool_call                            │
│  2. Tool message with result:                                   │
│     {                                                           │
│       role: "tool",                                             │
│       content: JSON.stringify({                                 │
│         overallScore: 78,                                       │
│         dimensions: { ... },                                    │
│         improvements: [...]                                     │
│       }),                                                       │
│       tool_call_id: "call_abc123"                              │
│     }                                                           │
│                                                                 │
│  Send back to OpenAI for interpretation                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. OPENAI GENERATES FINAL RESPONSE                             │
│                                                                 │
│  OpenAI reads the tool result and generates natural response:   │
│                                                                 │
│  "I've analyzed John's essay about robotics. Here are the      │
│   results:                                                      │
│                                                                 │
│   Overall Score: 78/100                                         │
│                                                                 │
│   Strengths:                                                    │
│   - Clear narrative structure                                   │
│   - Strong technical descriptions                               │
│                                                                 │
│   Areas for improvement:                                        │
│   - Contains 3 clichés that should be removed                   │
│   - Add more personal reflection                                │
│   - Reduce passive voice (found 5 instances)"                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. STREAM RESPONSE TO USER                                     │
│                                                                 │
│  Server-Sent Events (SSE) streaming:                            │
│  data: {"type":"token","content":"I've"}                       │
│  data: {"type":"token","content":" analyzed"}                  │
│  data: {"type":"token","content":" John's"}                    │
│  ...                                                            │
│  data: {"type":"done"}                                         │
│                                                                 │
│  User sees response appear word-by-word                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Tool Definition (Example)

### How a Tool is Defined

**File: `lib/ai/tools.ts`**

```typescript
export const aiTools: AITool[] = [
  {
    type: "function",
    function: {
      name: "analyze_essay",  // Tool identifier

      // Description helps OpenAI decide WHEN to use this tool
      description: "Analyze a college essay for quality, effectiveness, clichés, and writing strength. Provides detailed scoring and actionable feedback.",

      // Parameters define what OpenAI should pass to the function
      parameters: {
        type: "object",
        properties: {
          essayContent: {
            type: "string",
            description: "The essay text to analyze (minimum 50 characters)",
          },
        },
        required: ["essayContent"],  // OpenAI must provide this
      },
    },
  },
  // ... 20 more tools
];
```

### Key Components:

1. **`name`**: Unique identifier for the tool
2. **`description`**: Tells OpenAI WHEN and WHY to use this tool
3. **`parameters`**: JSON Schema defining the function arguments
4. **`required`**: Which parameters are mandatory

---

## ⚙️ Tool Execution (Example)

### How a Tool is Executed

**File: `lib/ai/tools.ts` (executeTool function)**

```typescript
export async function executeTool(
  toolCall: AIToolCall,
  userId: string
): Promise<AIToolResult> {
  // Parse arguments from OpenAI
  let args: Record<string, any>;
  if (typeof toolCall.arguments === "string") {
    args = JSON.parse(toolCall.arguments);
  } else {
    args = toolCall.arguments;
  }

  // BIG SWITCH STATEMENT - Routes to correct handler
  switch (toolCall.name) {

    case "analyze_essay": {
      // 1. Validate required arguments
      if (!args.essayContent) {
        throw new Error("essayContent is required");
      }

      try {
        // 2. Call the actual intelligence function
        const analysis = await analyzeEssay(args.essayContent);

        // 3. Return result in standard format
        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: analysis,  // Complex object with scores, feedback, etc.
        };
      } catch (error) {
        throw new Error(`Failed to analyze essay: ${error.message}`);
      }
    }

    case "semantic_search": {
      // Different tool, different logic
      const searchResults = await smartSearch(args.query, {
        limit: args.limit || 5,
        threshold: 0.65,
      });

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: {
          interpretation: searchResults.interpretation,
          students: searchResults.results.students,
          essays: searchResults.results.essays,
          // ... more data
        },
      };
    }

    // ... 19 more cases

    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}
```

---

## 🎯 How OpenAI Decides to Call Tools

### OpenAI's Decision Process

1. **Reads system prompt** - Understands it's a college counseling assistant
2. **Reads user message** - "Analyze John's essay"
3. **Checks available tools** - Sees `analyze_essay` tool
4. **Matches intent to tool** - "analyze" + "essay" = `analyze_essay` tool
5. **Extracts parameters** - Finds essay content from context or asks for it
6. **Calls tool** - Generates tool call with arguments

### Example Decision Making:

**User Message:**
```
"Show me students interested in computer science"
```

**OpenAI thinks:**
```
- User wants to find students
- Specific criteria: "computer science"
- I have a 'semantic_search' tool that can search by meaning
- I should use semantic_search with query "computer science students"
```

**OpenAI calls:**
```json
{
  "name": "semantic_search",
  "arguments": {
    "query": "students interested in computer science",
    "searchTypes": ["students"],
    "limit": 10
  }
}
```

---

## 🔌 Integration Points

### 1. OpenAI Service (`lib/ai/openai.ts`)

**Sends tools to OpenAI API:**

```typescript
const requestOptions = {
  model: "gpt-4o-mini",
  messages: requestMessages,
  temperature: 0.7,
  max_tokens: 2000,

  // IMPORTANT: Tools are passed here
  tools: options.tools.map((tool) => ({
    type: "function",
    function: tool.function,
  })),
};

const response = await this.client.chat.completions.create(requestOptions);

// Check if OpenAI called any tools
if (response.choices[0].message.tool_calls) {
  // Extract tool calls
  for (const tc of response.choices[0].message.tool_calls) {
    toolCalls.push({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    });
  }
}
```

### 2. Chatbot Route (`app/api/v1/chatbot/chat/route.ts`)

**Handles tool execution:**

```typescript
// Streaming response
for await (const chunk of aiServiceManager.chatStream(aiMessages, {
  systemPrompt: SYSTEM_PROMPT,
  tools: aiTools,  // Pass all 21 tools
})) {

  if (chunk.type === "tool_call" && chunk.toolCall) {
    // OpenAI wants to call a tool
    toolCalls.push(chunk.toolCall);
  }

  if (chunk.type === "done") {
    // Process tool calls
    if (toolCalls.length > 0) {
      const toolMessages = [];

      for (const toolCall of toolCalls) {
        // Execute the tool
        const toolResult = await executeTool(toolCall, user.id);

        // Add tool result to conversation
        toolMessages.push({
          role: "tool",
          content: JSON.stringify(toolResult.result),
          tool_call_id: toolCall.id,
        });
      }

      // Send tool results back to OpenAI for final response
      for await (const chunk of aiServiceManager.chatStream(
        [...aiMessages, ...toolMessages],
        { systemPrompt: SYSTEM_PROMPT, tools: aiTools }
      )) {
        // Stream final response to user
      }
    }
  }
}
```

---

## 🧩 Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                   (React Frontend / Chatbot)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ POST /api/v1/chatbot/chat
                         │ { message: "Analyze this essay" }
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CHATBOT API ROUTE                             │
│         app/api/v1/chatbot/chat/route.ts                       │
│                                                                 │
│  1. Authenticate user                                           │
│  2. Load conversation history (last 10 messages)                │
│  3. Build message array for OpenAI                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI SERVICE MANAGER                           │
│              lib/ai/index.ts (aiServiceManager)                │
│                                                                 │
│  - Manages fallback between OpenAI, Azure, Gemini              │
│  - Wraps all AI services with common interface                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OPENAI SERVICE                              │
│                  lib/ai/openai.ts                              │
│                                                                 │
│  chatStream(messages, { tools: aiTools }) {                    │
│    // Send to OpenAI API with function definitions             │
│    const response = await openai.chat.completions.create({     │
│      model: "gpt-4o-mini",                                     │
│      messages: messages,                                       │
│      tools: tools,  // <-- ALL TOOL DEFINITIONS                │
│      stream: true                                              │
│    })                                                          │
│  }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OPENAI API                                 │
│                  (External Service)                             │
│                                                                 │
│  GPT-4o-mini model:                                            │
│  - Reads conversation                                           │
│  - Analyzes user intent                                         │
│  - Decides which tools to call                                  │
│  - Generates tool calls with arguments                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ Returns: tool_call or text response
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TOOL EXECUTION ROUTER                          │
│            lib/ai/tools.ts (executeTool)                       │
│                                                                 │
│  switch (toolName) {                                           │
│    case "analyze_essay": → analyzeEssay()                      │
│    case "semantic_search": → smartSearch()                     │
│    case "recommend_colleges": → findCollegeMatches()           │
│    // ... 18 more tools                                        │
│  }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  INTELLIGENCE MODULES                           │
│               lib/intelligence/*.ts                            │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ essay-analyzer   │  │ college-matcher  │                   │
│  │ - Analyzes essays│  │ - Matches schools│                   │
│  │ - Scores quality │  │ - Calculates fit │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ semantic-search  │  │ activity-scorer  │                   │
│  │ - Vector search  │  │ - Scores ECs     │                   │
│  │ - Embeddings     │  │ - Tier ranking   │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ timeline-gen     │  │ strength-card    │                   │
│  │ - Auto timelines │  │ - Holistic eval  │                   │
│  │ - Dependencies   │  │ - Competitiveness│                   │
│  └──────────────────┘  └──────────────────┘                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                 │
│                 (Supabase PostgreSQL)                          │
│                                                                 │
│  - students, essays, activities, tasks                          │
│  - conversations, messages                                      │
│  - colleges, applications                                       │
│  - RLS (Row Level Security) for data isolation                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💡 Key Insights

### 1. **Tools are NOT hardcoded responses**

Tools execute REAL code:
- Query databases
- Run AI analysis
- Calculate scores
- Generate content
- Search with embeddings

### 2. **OpenAI decides when to call tools**

You don't manually trigger tools. OpenAI:
- Reads the tool descriptions
- Analyzes user intent
- Automatically calls appropriate tools
- Can call multiple tools in sequence
- Can choose NOT to call tools if not needed

### 3. **Two-pass system for tool responses**

```
Pass 1: User message → OpenAI → Tool call
        ↓
        Execute tool → Get result
        ↓
Pass 2: Tool result → OpenAI → Natural language response → User
```

### 4. **Tools enable real-time data**

Without tools:
```
User: "Who are my students?"
AI: "I don't have access to your student data."
```

With tools:
```
User: "Who are my students?"
AI: [Calls get_students tool]
    "You have 47 students. Here are your students..."
```

### 5. **Streaming maintains responsiveness**

- Tool execution happens behind the scenes
- User sees "thinking" indicator
- Final response streams word-by-word
- No blocking wait for tool results

---

## 🎯 Real Examples

### Example 1: Simple Tool Call

**User:** "Show me John's tasks"

```typescript
// 1. OpenAI receives message + tools
// 2. OpenAI decides: Use 'get_tasks' tool

toolCall = {
  name: "get_tasks",
  arguments: { studentId: "john-uuid" }
}

// 3. Execute tool
const result = await executeTool(toolCall, userId);
// Queries: SELECT * FROM tasks WHERE student_id = 'john-uuid'

// 4. Return result to OpenAI
result = {
  tasks: [
    { title: "MIT Essay", dueDate: "2025-11-01", priority: "high" },
    { title: "Request LORs", dueDate: "2025-10-15", priority: "medium" }
  ]
}

// 5. OpenAI generates response
"John has 2 tasks:
1. MIT Essay (Due Nov 1) - High Priority
2. Request LORs (Due Oct 15) - Medium Priority"
```

### Example 2: Complex Tool Call

**User:** "Analyze this essay and suggest similar ones"

```typescript
// OpenAI calls TWO tools in sequence:

// First tool call
toolCall1 = {
  name: "analyze_essay",
  arguments: { essayContent: "..." }
}

result1 = await analyzeEssay(essayContent);
// Returns: scores, feedback, analysis

// Second tool call (based on first result)
toolCall2 = {
  name: "find_similar_content",
  arguments: {
    entityType: "essay",
    entityId: "essay-uuid",
    limit: 5
  }
}

result2 = await findSimilarEssays(essayId);
// Returns: 5 similar essays with scores

// OpenAI combines both results
"I've analyzed the essay (78/100) and found 5 similar essays:
1. Sarah's essay (0.89 similarity) - About robotics competition
2. Mike's essay (0.85 similarity) - STEM leadership theme
..."
```

---

## 🚀 Adding a New Tool

### Step 1: Define the Tool

```typescript
// lib/ai/tools.ts
{
  type: "function",
  function: {
    name: "calculate_gpa_trend",
    description: "Calculate GPA trend over time for a student",
    parameters: {
      type: "object",
      properties: {
        studentId: { type: "string", description: "Student UUID" },
        semesters: { type: "number", description: "Number of semesters to analyze" }
      },
      required: ["studentId"]
    }
  }
}
```

### Step 2: Add Execution Handler

```typescript
// lib/ai/tools.ts (in executeTool function)
case "calculate_gpa_trend": {
  const { studentId, semesters = 4 } = args;

  // Your logic here
  const trend = await calculateGPATrend(studentId, semesters);

  return {
    toolCallId: toolCall.id,
    name: toolCall.name,
    result: trend
  };
}
```

### Step 3: Implement the Logic

```typescript
// lib/intelligence/gpa-analyzer.ts
export async function calculateGPATrend(
  studentId: string,
  semesters: number
): Promise<GPATrend> {
  // Query database
  // Calculate trend
  // Return analysis
}
```

### Step 4: Test

```
User: "Show me John's GPA trend"
AI: [Automatically calls calculate_gpa_trend tool]
    "John's GPA has improved from 3.5 to 3.8 over the last 4 semesters..."
```

---

## 🎓 Summary

### The Magic Formula:

1. **Define tools** = Tell OpenAI what functions exist
2. **OpenAI decides** = AI chooses when to use tools
3. **Execute tools** = Run real code with arguments
4. **Return results** = Send data back to OpenAI
5. **Natural response** = AI converts data to readable text

### Key Benefits:

✅ **Dynamic** - Tools execute real code, not static responses
✅ **Intelligent** - OpenAI decides when to use tools
✅ **Extensible** - Easy to add new tools
✅ **Secure** - User authentication checked during execution
✅ **Flexible** - Tools can call other tools, APIs, databases

### This is how we went from CRUD wrapper to intelligent platform! 🚀
