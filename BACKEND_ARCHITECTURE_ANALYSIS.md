# Backend Architecture & Polling Analysis
## College Application Management Platform (CAMP)

---

## Architecture Overview

The CAMP platform uses a **Next.js 15** application with **Supabase** as the backend database and authentication provider. The architecture follows a modern serverless pattern with API routes, scheduled cron jobs, and real-time client-side data management.

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐      ┌──────────────────┐                         │
│  │  React Pages    │◄────►│  React Query     │                         │
│  │  (Next.js 15)   │      │  Cache Manager   │                         │
│  │                 │      │  - staleTime: 30s│                         │
│  │  - /students    │      │  - gcTime: 5m    │                         │
│  │  - /tasks       │      │  - retry: 3x     │                         │
│  │  - /chatbot     │      └──────────────────┘                         │
│  └─────────────────┘              │                                     │
│         │                          │                                     │
│         │                          ▼                                     │
│         │              ┌──────────────────────┐                         │
│         └─────────────►│   ApiClient          │                         │
│                        │   /lib/api/client.ts │                         │
│                        │                      │                         │
│                        │  - getStudents()     │                         │
│                        │  - getTasks()        │                         │
│                        │  - sendChatMessage() │                         │
│                        └──────────────────────┘                         │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     │ HTTP/HTTPS
                                     │
┌────────────────────────────────────┼─────────────────────────────────────┐
│                           NEXT.JS API ROUTES                             │
├────────────────────────────────────┼─────────────────────────────────────┤
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │              API Route Handlers                              │       │
│  │                                                               │       │
│  │  /api/v1/students/route.ts          (GET, POST)             │       │
│  │  /api/v1/students/[id]/route.ts     (GET, PATCH, DELETE)    │       │
│  │  /api/v1/tasks/route.ts             (GET, POST)             │       │
│  │  /api/v1/tasks/[id]/route.ts        (GET, PATCH, DELETE)    │       │
│  │  /api/v1/chatbot/chat/route.ts      (POST - Streaming)      │       │
│  │  /api/v1/chatbot/conversations/route.ts  (GET)              │       │
│  │  /api/health/route.ts                (GET - Health Check)    │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                    │                                     │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │            Authentication Middleware                         │       │
│  │            /middleware.ts                                    │       │
│  │                                                               │       │
│  │  - Validates Supabase session                               │       │
│  │  - Protects /api/v1/* routes                                │       │
│  │  - Redirects unauthenticated users to /auth/login           │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT LAYER                              │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │  Server Client       │  │  Admin Client        │                │
│  │  (SSR - Cookies)     │  │  (Service Role)      │                │
│  │                      │  │                      │                │
│  │  /lib/supabase/      │  │  /lib/supabase/      │                │
│  │      server.ts       │  │      admin.ts        │                │
│  │                      │  │                      │                │
│  │  Used by:            │  │  Used by:            │                │
│  │  - API routes        │  │  - Cron jobs         │                │
│  │  - Server components │  │  - Background tasks  │                │
│  └──────────────────────┘  └──────────────────────┘                │
│            │                           │                             │
│            └───────────┬───────────────┘                             │
│                        │                                             │
└────────────────────────┼─────────────────────────────────────────────┘
                         │
                         │ PostgreSQL Protocol
                         │
┌────────────────────────▼─────────────────────────────────────────────┐
│                    SUPABASE / POSTGRESQL                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │    Database    │  │  Row Level     │  │  Auth System   │       │
│  │    Tables      │  │  Security      │  │  (Google OAuth)│       │
│  │                │  │  (RLS)         │  │                │       │
│  │  - users       │  │                │  │  - auth.users  │       │
│  │  - students    │  │  - Enabled on  │  │  - Sessions    │       │
│  │  - tasks       │  │    all tables  │  │  - JWT tokens  │       │
│  │  - colleges    │  │  - counselor_id│  │                │       │
│  │  - essays      │  │    isolation   │  │                │       │
│  │  - LORs        │  │                │  │                │       │
│  │  - messages    │  │                │  │                │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                    SCHEDULED JOBS (VERCEL CRON)                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  /api/cron/reminders                                     │       │
│  │  Schedule: "0 9 * * *" (9:00 AM Daily)                  │       │
│  │                                                           │       │
│  │  - Queries tasks due within 24 hours                    │       │
│  │  - Sends reminder notifications                          │       │
│  │  - Uses Admin Client (service role)                     │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  /api/cron/progress-recalc                               │       │
│  │  Schedule: "0 2 * * *" (2:00 AM Daily)                  │       │
│  │                                                           │       │
│  │  - Recalculates application progress for all students   │       │
│  │  - Aggregates data from essays, colleges, LORs          │       │
│  │  - Updates student records                              │       │
│  │  - Uses Admin Client (service role)                     │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│  Authentication: Bearer token via CRON_SECRET env variable          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Diagrams

### 2.1 Client-Side Data Fetching (Polling Strategy)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENT-SIDE POLLING MECHANISM (React Query)                       │
└─────────────────────────────────────────────────────────────────────┘

User Opens Page
      │
      ▼
┌─────────────────────┐
│ React Query Hook    │
│ useQuery({          │
│   queryKey,         │
│   queryFn,          │
│   staleTime: 30s    │◄──────────┐
│ })                  │           │
└─────────────────────┘           │
      │                            │
      │ Initial Load               │ Refetch if stale
      ▼                            │
┌─────────────────────┐           │
│ Fetch from API      │           │
│ /api/v1/students    │           │
└─────────────────────┘           │
      │                            │
      ▼                            │
┌─────────────────────┐           │
│ Cache Response      │           │
│ (5 min gcTime)      │───────────┘
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ Render UI           │
└─────────────────────┘
      │
      │ After 30 seconds (staleTime)
      │
      ▼
┌─────────────────────┐
│ Mark as Stale       │
└─────────────────────┘
      │
      │ On any trigger:
      │ - Manual refetch
      │ - Mutation success
      │ - Component remount
      │
      └────────────────────────► Back to Refetch


Key Behaviors:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Initial fetch: Always fetches on first mount
• Stale time: 30 seconds (data considered fresh)
• Cache time: 5 minutes (garbage collection)
• No window focus refetch (refetchOnWindowFocus: false)
• Retry: 3 attempts on failure
• Manual refetch: Triggered by mutations or user actions
```

### 2.2 Server-Side Cron Job Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  CRON JOB EXECUTION FLOW                                            │
└─────────────────────────────────────────────────────────────────────┘

Vercel Cron Scheduler
      │
      │ At scheduled time
      │ (e.g., 9:00 AM for reminders)
      ▼
┌──────────────────────┐
│ POST Request to      │
│ /api/cron/reminders  │
│                      │
│ Headers:             │
│ Authorization:       │
│   Bearer CRON_SECRET │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Verify CRON_SECRET   │───── ✗ Invalid ────► 401 Unauthorized
└──────────────────────┘
      │ ✓ Valid
      ▼
┌──────────────────────┐
│ Create Admin Client  │
│ (Service Role Key)   │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Query Database       │
│                      │
│ SELECT * FROM tasks  │
│ WHERE status='pending'│
│ AND due_date <= NOW() │
│   + 24 hours         │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Process Each Task    │
│                      │
│ For each task:       │
│ - Check reminder flags│
│ - Send notification  │
│ - Update task record │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Return Success       │
│ {                    │
│   success: true,     │
│   tasksProcessed: N  │
│ }                    │
└──────────────────────┘
```

---

## 3. Database Connection Management

### 3.1 Supabase Client Types

```
┌─────────────────────────────────────────────────────────────────────┐
│  SUPABASE CLIENT HIERARCHY                                          │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Browser Client (/lib/supabase/client.ts)                     │
├────────────────────────────────────────────────────────────────┤
│  Environment: Client-side only                                 │
│  Authentication: NEXT_PUBLIC_SUPABASE_ANON_KEY                │
│  RLS: Enforced (counselor_id isolation)                       │
│  Session: Uses browser cookies                                 │
│  Used by: React components, client-side hooks                 │
│                                                                │
│  createBrowserClient(                                          │
│    NEXT_PUBLIC_SUPABASE_URL,                                  │
│    NEXT_PUBLIC_SUPABASE_ANON_KEY                              │
│  )                                                             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Server Client (/lib/supabase/server.ts)                      │
├────────────────────────────────────────────────────────────────┤
│  Environment: Server-side (API routes, SSR)                   │
│  Authentication: NEXT_PUBLIC_SUPABASE_ANON_KEY + Cookies      │
│  RLS: Enforced (counselor_id isolation)                       │
│  Session: Uses Next.js cookies                                 │
│  Used by: API routes, server components                       │
│                                                                │
│  createServerClient(                                           │
│    NEXT_PUBLIC_SUPABASE_URL,                                  │
│    NEXT_PUBLIC_SUPABASE_ANON_KEY,                             │
│    { cookies: { get, set, remove } }                          │
│  )                                                             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Admin Client (/lib/supabase/admin.ts)                        │
├────────────────────────────────────────────────────────────────┤
│  Environment: Server-side only (secure)                       │
│  Authentication: SUPABASE_SERVICE_ROLE_KEY                    │
│  RLS: BYPASSED (full database access)                         │
│  Session: No session, no auth refresh                          │
│  Used by: Cron jobs, administrative tasks                     │
│                                                                │
│  createClient(                                                 │
│    NEXT_PUBLIC_SUPABASE_URL,                                  │
│    SUPABASE_SERVICE_ROLE_KEY,                                 │
│    {                                                           │
│      auth: {                                                   │
│        autoRefreshToken: false,                               │
│        persistSession: false                                   │
│      }                                                         │
│    }                                                           │
│  )                                                             │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Connection Pooling

```
Supabase automatically manages connection pooling:

┌─────────────────────────────────────────────┐
│  Supabase Connection Management             │
├─────────────────────────────────────────────┤
│                                             │
│  Default Pool: 15 connections               │
│  (Free tier)                                │
│                                             │
│  ┌────────────────────────────────┐        │
│  │  Connection Pool               │        │
│  │  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐          │        │
│  │  │ │ │ │ │ │ │ │ │ │ ... x15  │        │
│  │  └─┘ └─┘ └─┘ └─┘ └─┘          │        │
│  │                                 │        │
│  │  Used by all clients            │        │
│  └────────────────────────────────┘        │
│                                             │
│  Features:                                  │
│  • Automatic connection reuse               │
│  • Connection lifecycle management          │
│  • Query queueing when pool exhausted      │
│  • Health checks & reconnection            │
│                                             │
└─────────────────────────────────────────────┘

Application doesn't need to manage pooling directly.
Supabase-js handles this transparently.
```

---

## 4. API Route Request Flow

### 4.1 Typical API Request Lifecycle

```
Client Request: GET /api/v1/students?search=john
      │
      ▼
┌──────────────────────┐
│ Next.js Middleware   │
│ /middleware.ts       │
│                      │
│ • Check session      │
│ • Validate auth      │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ API Route Handler    │
│ /api/v1/students/    │
│      route.ts        │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Create Server Client │
│ await createClient() │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Get Authenticated    │
│ User                 │
│ supabase.auth        │
│   .getUser()         │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Build Query          │
│                      │
│ supabase             │
│   .from('students')  │
│   .select('*')       │
│   .eq('counselor_id',│
│       user.id)       │
│   .ilike('first_name'│
│       , '%john%')    │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Execute Query        │
│ (PostgreSQL)         │
│                      │
│ • RLS policies apply │
│ • Filters by user    │
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ Return Response      │
│                      │
│ NextResponse.json({  │
│   data: [...],       │
│   success: true      │
│ })                   │
└──────────────────────┘
      │
      ▼
Client receives JSON response
```

---

## 5. Polling & Real-Time Strategy

### Current Implementation: **Stale-While-Revalidate (SWR) via React Query**

```
┌─────────────────────────────────────────────────────────────────────┐
│  POLLING STRATEGY TIMELINE                                          │
└─────────────────────────────────────────────────────────────────────┘

T=0s      Initial fetch
          ├─ Query executes
          └─ Data cached

T=10s     User sees cached data
          └─ Data still "fresh"

T=30s     Data becomes "stale"
          ├─ Still shows cached data
          └─ Marked for refetch on next interaction

T=45s     User performs action (mutation)
          ├─ Automatic refetch triggered
          └─ New data fetched & cached

T=5m      Cache garbage collection
          └─ Unused queries removed from memory


Configuration (components/providers.tsx):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
defaultOptions: {
  queries: {
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchOnWindowFocus: false, // No auto-refetch on focus
    retry: 3,                    // 3 retry attempts
  }
}
```

### No Active Polling

**Key Point:** The application does NOT use active polling. Instead:

1. **Initial Load:** Data fetched on component mount
2. **Stale Time:** Data considered fresh for 30 seconds
3. **Manual Refetch:** Triggered by:
   - User interactions (form submissions)
   - Mutations (create, update, delete)
   - Manual refresh actions
4. **No Background Polling:** No setInterval or websocket connections

### Cron-Based Updates

Instead of client-side polling, background updates happen via cron jobs:

- **Reminders Cron:** Runs at 9:00 AM daily
- **Progress Recalc Cron:** Runs at 2:00 AM daily

These run server-side and update the database. When users next fetch data (or after stale time), they see updated information.

---

## 6. Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  CORE TABLES & RELATIONSHIPS                                        │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────┐
│    users      │
│ (counselors)  │
└───────┬───────┘
        │
        │ 1:N
        │
        ▼
┌───────────────┐     1:N     ┌──────────────────┐
│   students    │─────────────►│  student_colleges│
└───────┬───────┘              └──────────────────┘
        │                               │
        │ 1:N                           │ N:1
        │                               │
        ├───────────────┐               │
        │               │               │
        ▼               ▼               ▼
┌───────────┐   ┌──────────────┐  ┌──────────┐
│   tasks   │   │    essays    │  │ colleges │
└───────────┘   └──────────────┘  └──────────┘

        │               │
        │               │
        │               │
        ▼               ▼
┌────────────────────────────────┐
│  letters_of_recommendation     │
└────────────────────────────────┘

        │
        │ 1:N
        │
        ▼
┌──────────────────────┐
│  ai_task_suggestions │
└──────────────────────┘

        │
        │ 1:N
        │
        ▼
┌──────────────────────┐
│   notifications      │
└──────────────────────┘

        │
        │ 1:N
        │
        ▼
┌──────────────────────┐
│   chatbot_messages   │
└──────────────────────┘
```

---

## 7. Security Model

### Row Level Security (RLS) Implementation

```
┌─────────────────────────────────────────────────────────────────────┐
│  RLS POLICIES - COUNSELOR ISOLATION                                 │
└─────────────────────────────────────────────────────────────────────┘

All tables with counselor_id column enforce:

┌────────────────────────────────────────┐
│  SELECT Policy                         │
├────────────────────────────────────────┤
│  Allow read if:                        │
│    counselor_id = auth.uid()           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  INSERT Policy                         │
├────────────────────────────────────────┤
│  Allow insert if:                      │
│    counselor_id = auth.uid()           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  UPDATE Policy                         │
├────────────────────────────────────────┤
│  Allow update if:                      │
│    counselor_id = auth.uid()           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  DELETE Policy                         │
├────────────────────────────────────────┤
│  Allow delete if:                      │
│    counselor_id = auth.uid()           │
└────────────────────────────────────────┘


Result: Each counselor can only access their own data.
No cross-counselor data leakage possible.
```

---

## 8. Performance Considerations

### Current Optimization Strategies

```
1. CLIENT-SIDE CACHING
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • React Query cache: 5 minutes
   • Stale time: 30 seconds
   • Reduces unnecessary API calls
   • Instant UI updates from cache

2. DATABASE INDEXES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • idx_students_counselor (counselor_id)
   • idx_students_email (email)
   • idx_tasks_counselor (counselor_id)
   • idx_tasks_student (student_id)
   • idx_tasks_due_date (due_date)
   • Full-text search indexes (planned)

3. QUERY OPTIMIZATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • RLS automatically filters by counselor_id
   • Compound indexes for common queries
   • Pagination support (planned)
   • Select specific columns (not SELECT *)

4. API RESPONSE SIZE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • JSON responses
   • No over-fetching (specific fields)
   • Compression enabled (Vercel)

5. SERVERLESS BENEFITS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • Auto-scaling API routes
   • Edge caching (Vercel CDN)
   • Minimal cold start times
```

---

## 9. Key Takeaways

### Architecture Highlights

1. **No Active Polling:** Application uses stale-while-revalidate strategy
2. **Cron Jobs:** Server-side scheduled tasks for batch operations
3. **Three-Tier Client Model:** Browser, Server, and Admin clients
4. **RLS Security:** Database-level isolation between counselors
5. **React Query:** Intelligent cache management reduces API load
6. **Serverless:** Next.js API routes auto-scale on Vercel

### Data Freshness Strategy

```
┌────────────────────────────────────────────────────────────┐
│  HOW DATA STAYS FRESH                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. User opens page → Fresh fetch                         │
│  2. Data cached for 30s (stale time)                      │
│  3. User makes changes → Mutation triggers refetch        │
│  4. Cron jobs run overnight → Database updated            │
│  5. Next page load → Shows updated data                   │
│                                                            │
│  No continuous polling required!                           │
└────────────────────────────────────────────────────────────┘
```

### Future Enhancements (Potential)

- **Supabase Realtime:** WebSocket subscriptions for live updates
- **Optimistic Updates:** Immediate UI updates before server confirmation
- **Infinite Scroll:** Pagination with prefetching
- **Service Workers:** Offline support with background sync

---

## 10. Connection Flow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│  END-TO-END REQUEST FLOW                                            │
└─────────────────────────────────────────────────────────────────────┘

1. User Action (e.g., clicks "Students")
         │
         ▼
2. React Component mounts
         │
         ▼
3. useQuery hook executes
         │
         ▼
4. Check React Query cache
         │
         ├─ If fresh (< 30s) → Return cached data ✓
         │
         └─ If stale → Continue to API
                │
                ▼
5. ApiClient.getStudents() called
         │
         ▼
6. HTTP Request: GET /api/v1/students
         │
         ▼
7. Next.js Middleware validates auth
         │
         ▼
8. API Route Handler processes request
         │
         ▼
9. Create Supabase Server Client (with cookies)
         │
         ▼
10. Execute PostgreSQL query with RLS
         │
         ▼
11. Supabase connection pool handles DB connection
         │
         ▼
12. Query results returned
         │
         ▼
13. API Route returns JSON
         │
         ▼
14. React Query caches response
         │
         ▼
15. Component renders with data
         │
         ▼
16. User sees updated UI ✓
```

---

**Generated:** 2025-10-29
**Version:** 1.0
**Project:** College Application Management Platform (CAMP)
