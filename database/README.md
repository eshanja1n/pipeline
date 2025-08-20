# Database Migrations

This directory contains SQL migration files for the Pipeline job board application.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended for development)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each migration file in order:
   - `001_create_jobs_table.sql`
   - `002_create_email_tracking_table.sql`
   - `003_create_email_content_table.sql`
   - `004_create_rls_policies.sql`
4. Run each migration one by one

### Option 2: Supabase CLI (For production/automated deployments)
```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## Table Structure

### jobs
- Stores job application records
- Links to authenticated users
- Tracks status, company, role, and other job details

### email_tracking
- Tracks which emails have been processed
- Links emails to job applications
- Stores LLM analysis results

### email_content
- Stores actual email content for LLM processing
- Separated for performance and privacy
- Linked one-to-one with email_tracking

## Security
- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Policies enforce user isolation