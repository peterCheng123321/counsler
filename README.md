# CAMP - College Application Management Platform

A comprehensive web application for college counselors to manage student applications, track progress, generate Letters of Recommendation, and coordinate tasks with AI assistance.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS 3, shadcn/ui (Radix UI), Lucide Icons, Framer Motion
- **State Management**: React Query (TanStack Query)
- **Backend**: Next.js API Routes (Route Handlers)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth)
- **AI Services**: OpenAI, Azure OpenAI, Gemini, Pinecone (Vector DB)
- **Deployment**: Vercel

## Project Structure

```
consuler/
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected app routes
│   │   ├── chatbot/       # Chatbot page
│   │   ├── students/      # Students page
│   │   └── tasks/         # Tasks page
│   ├── api/               # API routes
│   │   ├── health/        # Health check endpoint
│   │   └── v1/            # Versioned API endpoints
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── lib/                  # Utility libraries
│   ├── api/              # API client
│   ├── supabase/         # Supabase clients
│   └── utils.ts          # Utility functions
├── hooks/                # Custom React hooks
└── supabase/             # Database migrations
    └── migrations/       # SQL migration files
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (accessed via CLI)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your environment variables (Supabase credentials accessed via CLI, API keys from provided credentials).

3. Run database migrations:
```bash
# Using Supabase CLI (credentials already granted)
supabase db push
```

4. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See `.env.example` for all required environment variables. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_ASSISTANT_ID` - OpenAI Assistant ID
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_INDEX_NAME` - Pinecone index name

## Features Implemented

### ✅ Completed
- Next.js 15 project setup with TypeScript
- Tailwind CSS design system with PRD tokens
- shadcn/ui component library setup
- Supabase client configuration (browser, server, admin)
- Database schema with RLS policies (Phase 1: counselor_id based)
- Health check API endpoint
- Students API (CRUD operations)
- Tasks API (CRUD operations with filters)
- Frontend API client layer
- Basic layout and navigation header
- Auth middleware (Supabase-based)

### 🚧 In Progress
- Students UI components
- Tasks UI components
- Chatbot UI components
- Authentication pages
- AI service integration

## API Endpoints

### Health
- `GET /api/health` - System health check

### Students
- `GET /api/v1/students` - List students (with filters)
- `GET /api/v1/students/:id` - Get student details
- `POST /api/v1/students` - Create student
- `PATCH /api/v1/students/:id` - Update student
- `DELETE /api/v1/students/:id` - Delete student

### Tasks
- `GET /api/v1/tasks` - List tasks (with filters)
- `GET /api/v1/tasks/:id` - Get task details
- `POST /api/v1/tasks` - Create task
- `PATCH /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task

## Database Schema

The database includes tables for:
- Users (counselors)
- Students
- Colleges
- Student-College relationships
- Essays
- Activities
- Notes
- Tasks
- Conversations (Chatbot)
- Messages
- Letters of Recommendation
- AI Task Suggestions
- Notifications

All tables have Row Level Security (RLS) policies enforcing counselor-level access in Phase 1. Organization-level RBAC is prepared for Phase 2.

## Performance Targets

- API latency: p50 < 100ms, p95 < 300ms, p99 < 500ms
- Connection pooling via Supabase connection pooler
- Caching: React Query (client), Vercel Edge Cache (CDN)
- Query optimization with composite indexes

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

The application is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## License

Private project - All rights reserved





