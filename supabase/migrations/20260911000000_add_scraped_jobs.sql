-- Migration: Add scraped_jobs table and schedule columns
-- Run this in Supabase SQL Editor

-- 1. New table for scraped job results
CREATE TABLE IF NOT EXISTS scraped_jobs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  site_id INTEGER REFERENCES search_sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  company TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  bookmarked BOOLEAN DEFAULT false,
  seen BOOLEAN DEFAULT false,
  seen_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN DEFAULT false,
  UNIQUE(user_id, url)
);

-- 2. Add schedule_frequency and last_scraped_at to search_settings
ALTER TABLE search_settings
  ADD COLUMN IF NOT EXISTS schedule_frequency TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMP WITH TIME ZONE;

-- 3. Add last_scraped_at to search_sites for per-site tracking
ALTER TABLE search_sites
  ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMP WITH TIME ZONE;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_user_scraped
  ON scraped_jobs(user_id, scraped_at);
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_seen
  ON scraped_jobs(seen, seen_at);
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_user_dismissed
  ON scraped_jobs(user_id, dismissed);

-- 5. RLS policies for scraped_jobs
ALTER TABLE scraped_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own scraped jobs" 
  ON scraped_jobs 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
