# LangSmith Setup Guide

LangSmith provides observability and tracing for LangChain and LangGraph agents, helping you debug and monitor agent behavior.

## What You Get with LangSmith

- **Real-time Tracing**: See every step of agent execution (LLM calls, tool calls, reasoning)
- **Performance Monitoring**: Track latency, token usage, and cost per run
- **Debugging**: Identify where agents fail or produce unexpected results
- **Conversation History**: View full conversation context and state transitions
- **Tool Usage Analytics**: Understand which tools are used most frequently
- **Checkpoint Visualization**: See how agent memory persists across sessions

## Setup Instructions

### Step 1: Sign Up for LangSmith

1. Go to https://smith.langchain.com/
2. Create a free account (free tier includes 5,000 traces/month)
3. Create a new project (e.g., "consuler-dev")

### Step 2: Get Your API Key

1. In LangSmith dashboard, click on your profile icon (top right)
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Copy the API key (keep it secure!)

### Step 3: Update Environment Variables

In your `.env.local` file, update these variables:

```bash
# Enable tracing
LANGCHAIN_TRACING_V2=true

# Add your API key
LANGCHAIN_API_KEY=your_api_key_here

# Set your project name (must match the project you created in LangSmith)
LANGCHAIN_PROJECT=consuler-dev
```

### Step 4: Restart Development Server

```bash
# Stop current dev server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Test Tracing

1. Open your chatbot at http://localhost:3000/chatbot
2. Send a message that triggers tools (e.g., "Show me all students")
3. Go to your LangSmith dashboard: https://smith.langchain.com/
4. Click on your project ("consuler-dev")
5. You should see the trace appear with:
   - User message
   - LLM reasoning
   - Tool calls (get_students)
   - Tool results
   - Final response

## What Gets Traced

### LangGraph Agent (Default)
- Full conversation history with persistent memory
- Every tool call with input/output
- Checkpoint saves to PostgreSQL
- Multi-step reasoning chains
- Error traces with stack traces

### LangChain Agent (Legacy)
- Tool execution steps
- Intermediate reasoning
- Streaming token generation

## Viewing Traces

In LangSmith dashboard, each trace shows:

1. **Overview**: Total time, token count, cost
2. **Inputs**: User message and conversation history
3. **Steps**: Each LLM call and tool invocation
4. **Outputs**: Final response
5. **Metadata**: Model used, temperature, tokens

### Filtering Traces
- Filter by status (success/error)
- Filter by tool usage
- Filter by date range
- Search by conversation ID or user message

## Cost Tracking

LangSmith tracks:
- Total tokens used per trace
- Estimated cost based on model pricing
- Average cost per conversation
- Monthly spending trends

## Best Practices

1. **Use Different Projects for Environments**:
   - `consuler-dev` for local development
   - `consuler-staging` for staging
   - `consuler-prod` for production

2. **Add Custom Metadata**:
   - User ID (we use DEMO_USER_ID)
   - Conversation ID
   - Agent mode (langchain vs langgraph)

3. **Monitor Error Rates**:
   - Set up alerts for high error rates
   - Review failed traces to debug issues

4. **Review Tool Usage**:
   - Identify which tools are called most
   - Optimize slow tool implementations
   - Remove unused tools

## Disabling Tracing

To disable tracing (e.g., in production if cost is a concern):

```bash
LANGCHAIN_TRACING_V2=false
```

Or simply comment out the LangSmith variables.

## Troubleshooting

### "No traces appearing in LangSmith"
1. Verify `LANGCHAIN_TRACING_V2=true` (not "false")
2. Check API key is correct
3. Ensure project name matches exactly
4. Restart dev server after changing env vars
5. Check browser console for errors

### "Rate limit exceeded"
Free tier is limited to 5,000 traces/month. Upgrade to paid plan or:
- Disable tracing temporarily
- Only enable for debugging specific issues

### "Invalid API key"
- API key must be from LangSmith (not LangChain or OpenAI)
- Generate a new key from https://smith.langchain.com/settings/api-keys

## Optional: Production Setup

For production, use environment-specific configuration:

```bash
# .env.production
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=prod_api_key_here
LANGCHAIN_PROJECT=consuler-prod
```

Add sampling to reduce trace volume:
- Only trace 10% of requests
- Only trace errors
- Only trace when specific flags are set

## Learn More

- LangSmith Documentation: https://docs.smith.langchain.com/
- LangChain Tracing Guide: https://python.langchain.com/docs/langsmith/
- Pricing: https://smith.langchain.com/pricing
