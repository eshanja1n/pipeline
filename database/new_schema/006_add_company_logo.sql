-- Add company_logo column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_logo TEXT;

-- Add comment for the new column
COMMENT ON COLUMN jobs.company_logo IS 'URL or path to company logo image';