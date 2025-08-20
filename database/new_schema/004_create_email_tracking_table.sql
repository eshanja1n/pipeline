-- Create email_tracking table (tracks processing status per user)
CREATE TABLE email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE NOT NULL,
  is_processed BOOLEAN DEFAULT FALSE,
  is_job_related BOOLEAN DEFAULT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_id)
);

-- Create indexes for better performance
CREATE INDEX idx_email_tracking_user_id ON email_tracking(user_id);
CREATE INDEX idx_email_tracking_email_id ON email_tracking(email_id);
CREATE INDEX idx_email_tracking_is_processed ON email_tracking(is_processed);
CREATE INDEX idx_email_tracking_is_job_related ON email_tracking(is_job_related);
CREATE INDEX idx_email_tracking_job_id ON email_tracking(job_id);
CREATE INDEX idx_email_tracking_processed_at ON email_tracking(processed_at);

-- Create unique constraint to prevent duplicate tracking
CREATE UNIQUE INDEX idx_email_tracking_user_email_unique ON email_tracking(user_id, email_id);

-- Enable Row Level Security
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for email_tracking
CREATE POLICY "Users can view own email tracking" ON email_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email tracking" ON email_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email tracking" ON email_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email tracking" ON email_tracking
  FOR DELETE USING (auth.uid() = user_id);