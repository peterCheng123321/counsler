# AI Service Configuration

To enable AI functionality, add one of the following to your `.env.local` file:

## Option 1: OpenAI (Recommended)
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Option 2: Azure OpenAI
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

## Option 3: Google Gemini
```bash
GEMINI_API_KEY=your-gemini-api-key
```

## Getting API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Azure OpenAI**: https://azure.microsoft.com/en-us/products/ai-services/openai-service
- **Google Gemini**: https://makersuite.google.com/app/apikey

After adding your API key, restart the development server:
```bash
npm run dev
```

