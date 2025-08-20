# New Database Schema

Run these SQL files in order in your Supabase SQL Editor:

## Step 1: Create Tables
1. `001_create_users_table.sql` - Creates users table with email sync preferences
2. `002_create_emails_table.sql` - Creates emails table for storing email content
3. `003_create_jobs_table.sql` - Creates jobs table for job applications
4. `004_create_email_tracking_table.sql` - Creates email_tracking table for processing status
5. `005_add_last_sync_timestamp.sql` - Adds last_sync_timestamp column (run if users table already exists)

## Step 2: Migrate Existing Data (if needed)
After creating the new tables, you may want to migrate existing data from your current tables.

## Key Changes
- **Separated concerns**: Emails are stored once in `emails` table, tracking is per-user in `email_tracking`
- **User preferences**: Added `email_sync_enabled` and `last_sync_enabled_at` to users table
- **Timestamp-based sync**: Added `last_sync_timestamp` to only process emails after last sync
- **Simplified jobs**: Removed duplicate email-related fields from jobs table
- **Proper relationships**: Clear foreign key relationships between all tables
- **Row Level Security**: All tables have RLS policies for user data isolation

## Schema Overview
```
users (id, email, name, email_sync_enabled, last_sync_enabled_at, last_sync_timestamp)
  ↓
jobs (id, user_id, company, role, status, applied_date, ...)
  ↓
email_tracking (id, user_id, email_id, is_processed, is_job_related, job_id)
  ↓
emails (id, gmail_message_id, subject, sender_email, content, ...)
```