-- Create email_tracking table
CREATE TABLE email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gmail_message_id TEXT NOT NULL, -- Gmail's unique message ID
  gmail_thread_id TEXT NOT NULL,  -- Gmail's thread ID
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  received_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_processed BOOLEAN DEFAULT FALSE,
  is_job_related BOOLEAN DEFAULT NULL, -- NULL = not analyzed yet, TRUE/FALSE = LLM result
  associated_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  confidence_score DECIMAL(3,2), -- LLM confidence score (0.00 - 1.00)
  processing_notes TEXT, -- Any notes from LLM processing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_email_tracking_user_id ON email_tracking(user_id);
CREATE INDEX idx_email_tracking_gmail_message_id ON email_tracking(gmail_message_id);
CREATE INDEX idx_email_tracking_gmail_thread_id ON email_tracking(gmail_thread_id);
CREATE INDEX idx_email_tracking_is_processed ON email_tracking(is_processed);
CREATE INDEX idx_email_tracking_is_job_related ON email_tracking(is_job_related);
CREATE INDEX idx_email_tracking_received_date ON email_tracking(received_date);

-- Create unique constraint to prevent duplicate message tracking
CREATE UNIQUE INDEX idx_email_tracking_user_message_unique 
ON email_tracking(user_id, gmail_message_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_email_tracking_updated_at
  BEFORE UPDATE ON email_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();