-- Create email_content table
CREATE TABLE email_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_tracking_id UUID REFERENCES email_tracking(id) ON DELETE CASCADE NOT NULL,
  raw_body_text TEXT, -- Plain text version of email body
  raw_body_html TEXT, -- HTML version of email body
  cleaned_body_text TEXT, -- Processed/cleaned text for LLM analysis
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment info
  headers JSONB DEFAULT '{}'::jsonb, -- Important email headers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_email_content_tracking_id ON email_content(email_tracking_id);

-- Create unique constraint - one content record per email tracking record
CREATE UNIQUE INDEX idx_email_content_tracking_unique 
ON email_content(email_tracking_id);