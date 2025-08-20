-- Create emails table (stores all email information and content)
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_message_id TEXT UNIQUE NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT,
  received_date TIMESTAMP WITH TIME ZONE NOT NULL,
  plain_text_content TEXT,
  html_content TEXT,
  attachments JSONB DEFAULT '[]',
  headers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_emails_gmail_message_id ON emails(gmail_message_id);
CREATE INDEX idx_emails_gmail_thread_id ON emails(gmail_thread_id);
CREATE INDEX idx_emails_sender_email ON emails(sender_email);
CREATE INDEX idx_emails_received_date ON emails(received_date);
CREATE INDEX idx_emails_subject ON emails USING gin(to_tsvector('english', subject));
CREATE INDEX idx_emails_content ON emails USING gin(to_tsvector('english', plain_text_content));

-- Create unique constraint to prevent duplicate emails
CREATE UNIQUE INDEX idx_emails_gmail_message_unique ON emails(gmail_message_id);