# Deployment Guide for CAMP

## Vercel Deployment Steps

### 1. Environment Variables Setup

Before deploying, you need to set up environment variables in Vercel. Go to your Vercel project dashboard and add these variables:

#### Required Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_ASSISTANT_ID=your_openai_assistant_id
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_API_VERSION=2025-01-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=college-infos
```

### 2. Deploy via Vercel CLI

```bash
# If not already logged in
vercel login

# Deploy to production
vercel --prod
```

### 3. Deploy via GitHub (Recommended)

1. Push your code to GitHub:
```bash
git remote add origin https://github.com/yourusername/consuler.git
git push -u origin main
```

2. Connect your GitHub repository to Vercel:
   - Go to https://vercel.com/dashboard
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure environment variables
   - Deploy

### 4. Post-Deployment Steps

1. **Run Database Migrations**:
   - Ensure all Supabase migrations are applied
   - Check that RLS policies are enabled

2. **Verify Environment Variables**:
   - Check that all API keys are set correctly
   - Test AI service connectivity

3. **Test Deployment**:
   - Visit your deployed URL
   - Test authentication
   - Test chatbot functionality
   - Verify database queries work

## Features Deployed

✅ **Chatbot with Streaming AI**
- Real-time streaming responses
- Function calling for database queries
- Query caching for performance
- Conversation history management

✅ **Modern UI Design**
- Beautiful animations and transitions
- Responsive design for all devices
- Glass morphism effects
- Gradient backgrounds
- Enhanced typography

✅ **Database Integration**
- Students query by application type (Early Decision, Early Action, etc.)
- Tasks and deadlines management
- Real-time data fetching

✅ **AI Services**
- Azure OpenAI (primary)
- OpenAI (fallback)
- Gemini (fallback)
- Pinecone vector database ready

## Troubleshooting

### Build Failures
- Check all environment variables are set
- Verify TypeScript compilation passes locally
- Check Vercel build logs for errors

### Runtime Errors
- Verify Supabase connection
- Check AI service API keys
- Review server logs in Vercel dashboard

### Database Issues
- Ensure migrations are applied
- Check RLS policies are correct
- Verify connection pooling is enabled

