-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs table
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON jobs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for email_tracking table
CREATE POLICY "Users can view their own email tracking" ON email_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email tracking" ON email_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email tracking" ON email_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email tracking" ON email_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for email_content table
-- Note: Access is controlled through email_tracking relationship
CREATE POLICY "Users can view email content for their emails" ON email_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM email_tracking 
      WHERE email_tracking.id = email_content.email_tracking_id 
      AND email_tracking.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert email content for their emails" ON email_content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_tracking 
      WHERE email_tracking.id = email_content.email_tracking_id 
      AND email_tracking.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update email content for their emails" ON email_content
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM email_tracking 
      WHERE email_tracking.id = email_content.email_tracking_id 
      AND email_tracking.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete email content for their emails" ON email_content
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM email_tracking 
      WHERE email_tracking.id = email_content.email_tracking_id 
      AND email_tracking.user_id = auth.uid()
    )
  );