-- Add last_sync_timestamp column to users table if it doesn't exist
-- Run this if you've already created the users table without this column

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_sync_timestamp') THEN
        ALTER TABLE users ADD COLUMN last_sync_timestamp TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN users.last_sync_timestamp IS 'Timestamp of last successful email sync';
    END IF;
END $$;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_users_last_sync_timestamp ON users(last_sync_timestamp);