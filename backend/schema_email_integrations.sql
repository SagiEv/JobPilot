-- Create email_integrations table
CREATE TABLE email_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider VARCHAR(50) DEFAULT 'google',
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  connected_email VARCHAR(255),
  sync_status VARCHAR(50) DEFAULT 'idle',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Set up Row Level Security
ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and edit their own email integration
CREATE POLICY "Users can manage their own email integration"
  ON email_integrations
  FOR ALL
  USING (auth.uid() = user_id);
