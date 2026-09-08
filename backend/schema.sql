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
