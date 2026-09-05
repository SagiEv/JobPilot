-- Create AI Jobs table for async processing
CREATE TABLE IF NOT EXISTS public.ai_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'tailor_cv'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own ai_jobs"
    ON public.ai_jobs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai_jobs"
    ON public.ai_jobs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
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
-- Events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  title TEXT,
  company TEXT,
  date TIMESTAMP WITH TIME ZONE,
  type TEXT,
  details TEXT,
  interviewers JSONB,
  application_id INTEGER
);
-- RSS Feeds table
CREATE TABLE IF NOT EXISTS rss_feeds (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  category TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ingested RSS Jobs table
CREATE TABLE IF NOT EXISTS rss_jobs (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER REFERENCES rss_feeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  category TEXT,
  seniority TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Profile table
CREATE TABLE IF NOT EXISTS profile (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  website TEXT,
  roles TEXT,
  locations TEXT,
  cv TEXT,
  cv_data JSONB
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  company TEXT,
  role_id TEXT,
  date DATE,
  status TEXT,
  stage TEXT,
  location TEXT,
  info TEXT,
  referal TEXT,
  link TEXT,
  cv_file TEXT
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name TEXT,
  company TEXT,
  phone TEXT,
  relation TEXT
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT,
  tech TEXT,
  link TEXT,
  bullets JSONB
);

-- Experience Text table
CREATE TABLE IF NOT EXISTS experience_text (
  id SERIAL PRIMARY KEY,
  text TEXT
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  company TEXT,
  role TEXT,
  stage TEXT,
  date DATE,
  questions TEXT,
  keep JSONB,
  improve JSONB,
  feedback TEXT
);

-- Application History table
CREATE TABLE IF NOT EXISTS application_history (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  old_stage TEXT,
  new_stage TEXT,
  event_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  with_who TEXT,
  interview_id INTEGER REFERENCES interviews(id) ON DELETE SET NULL
);

-- Search Settings table
CREATE TABLE IF NOT EXISTS search_settings (
  id SERIAL PRIMARY KEY,
  keywords JSONB,
  exclude_keywords JSONB,
  email TEXT,
  schedule TEXT,
  last_results JSONB
);

-- Search Sites table
CREATE TABLE IF NOT EXISTS search_sites (
  id SERIAL PRIMARY KEY,
  name TEXT,
  url TEXT,
  enabled BOOLEAN DEFAULT true
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  name TEXT,
  category TEXT,
  level TEXT
);

-- App Settings table (per user)
-- Stores user-configured API tokens and preferences
CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  groq_token TEXT, -- Kept for backward compatibility, will be encrypted transparently
  openai_token_encrypted TEXT,
  claude_token_encrypted TEXT,
  gemini_token_encrypted TEXT,
  ai_routing JSONB,
  timezone TEXT DEFAULT 'Asia/Jerusalem',
  smtp_enabled BOOLEAN DEFAULT false,
  smtp_email TEXT,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 993,
  smtp_password_encrypted TEXT,
  smtp_last_uid TEXT,
  smtp_poll_interval_min INTEGER DEFAULT 15,
  smtp_last_polled_at TIMESTAMP WITH TIME ZONE
);


-- AI Analysis Reports table
CREATE TABLE IF NOT EXISTS ai_analysis_reports (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  keep_report JSONB,
  improve_report JSONB,
  overall_trends TEXT
);

-- RSS Feeds table
CREATE TABLE IF NOT EXISTS rss_feeds (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  category TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ingested RSS Jobs table
CREATE TABLE IF NOT EXISTS rss_jobs (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER REFERENCES rss_feeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  category TEXT,
  seniority TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding columns to skills and projects
ALTER TABLE skills ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 3. Create a function to match projects
CREATE OR REPLACE FUNCTION match_projects(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  tech_stack text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    projects.id,
    projects.title,
    projects.description,
    projects.tech_stack,
    1 - (projects.embedding <=> query_embedding) AS similarity
  FROM projects
  WHERE projects.user_id = p_user_id
    AND projects.embedding IS NOT NULL
    AND 1 - (projects.embedding <=> query_embedding) > match_threshold
  ORDER BY projects.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Create a function to match skills
CREATE OR REPLACE FUNCTION match_skills(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  level text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    skills.id,
    skills.name,
    skills.category,
    skills.level,
    1 - (skills.embedding <=> query_embedding) AS similarity
  FROM skills
  WHERE skills.user_id = p_user_id
    AND skills.embedding IS NOT NULL
    AND 1 - (skills.embedding <=> query_embedding) > match_threshold
  ORDER BY skills.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
-- Enable RLS on all tables (just in case they aren't already enabled)
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_text ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Create policies that allow ALL operations to ANYONE (Development Only!)
CREATE POLICY "Dev Allow All" ON profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON experience_text FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON interviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON search_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON search_sites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON skills FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ai_analysis_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dev Allow All" ON ai_analysis_reports FOR ALL USING (true) WITH CHECK (true);
