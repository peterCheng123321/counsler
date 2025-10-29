# Database Schema Review

## Migration File: `20241029000001_initial_schema.sql`

This migration creates the complete database schema for the CAMP (College Application Management Platform) application.

## Summary

The schema includes **13 main tables** with proper relationships, indexes, and Row Level Security (RLS) policies.

## Tables Overview

### 1. **users** (Counselors/Advisors)
- Stores counselor information
- Fields: id, email, password_hash, first_name, last_name, role, organization_id (Phase 2 RBAC), profile_picture_url, timestamps
- Indexes: email, organization_id
- RLS: Users can view their own profile

### 2. **students**
- Core student information
- Fields: id, counselor_id (FK), school_id (Phase 2 RBAC), name, email, phone, DOB, graduation_year
- Academic: gpa_unweighted, gpa_weighted, class_rank, class_size, SAT/ACT scores
- Progress: application_progress (0-100)
- Indexes: counselor_id, school_id, graduation_year, name, full-text search
- RLS: Counselors can only access their own students

### 3. **colleges**
- College/university information
- Fields: id, name, location (city, state, country), type, acceptance_rate, logo_url, website_url
- Indexes: name, unique (name + location)
- Note: Public read access (no RLS for MVP)

### 4. **student_colleges** (Many-to-Many)
- Links students to colleges with application details
- Fields: student_id (FK), college_id (FK), application_type (EA/ED/RD/Rolling), deadline, college_type (Safety/Target/Reach)
- Progress: application_status, application_progress, requirements tracking (essays, LORs, transcripts, test scores)
- Indexes: student_id, deadline, status
- RLS: Access through student relationship

### 5. **essays**
- Student essays for applications
- Fields: student_id (FK), student_college_id (FK), title, prompt, content, word_count, word_limit, status, version
- Indexes: student_id, status, student_college_id
- RLS: Access through student relationship

### 6. **activities**
- Student extracurricular activities
- Fields: student_id (FK), activity_name, position, description, participation_grades (array), timing, hours_per_week, weeks_per_year
- Indexes: student_id
- RLS: Access through student relationship

### 7. **notes**
- Counselor notes about students
- Fields: student_id (FK), counselor_id (FK), note_type, content, reminder_date, is_priority
- Indexes: student_id, reminder_date, counselor_id
- RLS: Counselors can manage their own notes

### 8. **tasks**
- Task management for counselors
- Fields: counselor_id (FK), student_id (FK, optional), title, description, due_date, due_time, priority, status, completed_at
- Reminders: reminder_1day, reminder_1hour, reminder_15min
- Indexes: counselor_id, student_id, due_date, status, composite indexes
- RLS: Counselors can manage their own tasks

### 9. **conversations** (Chatbot)
- Chat conversation containers
- Fields: id, counselor_id (FK), title, timestamps
- Indexes: counselor_id, updated_at DESC
- RLS: Counselors can manage their own conversations

### 10. **messages** (Chatbot)
- Individual chat messages
- Fields: conversation_id (FK), role (user/assistant), content, metadata (JSONB)
- Indexes: conversation_id, created_at
- RLS: Access through conversation relationship

### 11. **letters_of_recommendation**
- Generated Letters of Recommendation
- Fields: student_id (FK), counselor_id (FK), student_college_id (FK), program_type, relationship details, specific_examples, generated_content, status
- Indexes: student_id, counselor_id
- RLS: Counselors can manage their own LORs

### 12. **ai_task_suggestions**
- AI-generated task suggestions
- Fields: counselor_id (FK), student_id (FK, optional), suggestion_type, suggestion_text, priority, metadata (JSONB), status, expires_at
- Indexes: counselor_id, status, expires_at
- RLS: Counselors can manage their own suggestions

### 13. **notifications**
- User notifications
- Fields: user_id (FK), type, title, message, link_url, is_read, read_at
- Indexes: user_id, unread notifications, created_at DESC
- RLS: Users can manage their own notifications

## Key Features

### ✅ Indexes
- Strategic indexes on foreign keys, search fields, and frequently queried columns
- Composite indexes for multi-column queries
- Full-text search index on students (name + email)
- Partial indexes for optional fields (WHERE IS NOT NULL)

### ✅ Constraints
- CHECK constraints for enums (application_type, status, priority, etc.)
- UNIQUE constraints where needed (student email, student+college combination)
- Foreign key constraints with CASCADE/SET NULL where appropriate
- Progress validation (0-100 range)

### ✅ Row Level Security (RLS)
- **Phase 1**: Counselor-level access (all policies use `auth.uid() = counselor_id`)
- **Phase 2 Ready**: organization_id columns added but not enforced yet
- All tables have RLS enabled with appropriate policies
- Policies cover SELECT, INSERT, UPDATE, DELETE where needed

### ✅ Automatic Updates
- `updated_at` timestamp triggers on all relevant tables
- Uses PostgreSQL function `update_updated_at_column()`

### ✅ Data Types
- UUIDs for all primary keys (using uuid-ossp extension)
- TIMESTAMP WITH TIME ZONE for all timestamps
- JSONB for flexible metadata storage
- Arrays for participation_grades in activities
- DECIMAL for precise GPA calculations

## Migration Safety

- Uses `CREATE TABLE IF NOT EXISTS` for idempotency
- Uses `CREATE EXTENSION IF NOT EXISTS` for extensions
- Uses `CREATE OR REPLACE FUNCTION` for functions
- Indexes created separately (won't fail if table exists)
- Policies use `CREATE POLICY` (will fail if exists - safe)

## Potential Issues to Review

1. **Migration History**: Previous migrations (20251021-20251024) were marked as reverted. Ensure these didn't contain important schema changes.

2. **Users Table vs Supabase Auth**: 
   - We have a `users` table, but Supabase Auth uses `auth.users`
   - Need to ensure sync or decide on approach
   - RLS policies reference `auth.uid()` which comes from Supabase Auth

3. **Password Hash**: 
   - `users.password_hash` column exists but may not be needed if using Google OAuth only
   - Can be nullable or removed later

4. **School ID**: 
   - `school_id` columns added for Phase 2 RBAC but not used in Phase 1 policies
   - Consider if this is correct approach

## Next Steps

1. **Review Migration**: Examine the SQL file carefully
2. **Check Existing Schema**: Use Supabase Dashboard SQL Editor to check current tables
3. **Sync Users**: Decide on sync strategy between `auth.users` and `users` table
4. **Push Migration**: Run `supabase db push` once reviewed
5. **Verify**: Check tables, indexes, and RLS policies after push

## SQL File Location

```
supabase/migrations/20241029000001_initial_schema.sql
```

## Verification Queries

After pushing, run these in Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```


