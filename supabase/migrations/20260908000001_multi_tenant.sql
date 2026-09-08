-- Add user_id to tables that belong to a user
ALTER TABLE applications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE experience_text ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE search_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE search_sites ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop "Dev Allow All" policies for these tables if they exist
DROP POLICY IF EXISTS "Dev Allow All" ON applications;
DROP POLICY IF EXISTS "Dev Allow All" ON contacts;
DROP POLICY IF EXISTS "Dev Allow All" ON projects;
DROP POLICY IF EXISTS "Dev Allow All" ON experience_text;
DROP POLICY IF EXISTS "Dev Allow All" ON interviews;
DROP POLICY IF EXISTS "Dev Allow All" ON search_settings;
DROP POLICY IF EXISTS "Dev Allow All" ON search_sites;
DROP POLICY IF EXISTS "Dev Allow All" ON skills;
DROP POLICY IF EXISTS "Dev Allow All" ON profile;

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_text ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

-- Applications RLS
CREATE POLICY "Users can view their own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own applications" ON applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own applications" ON applications FOR DELETE USING (auth.uid() = user_id);

-- Contacts RLS
CREATE POLICY "Users can view their own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Projects RLS
CREATE POLICY "Users can view their own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Experience Text RLS
CREATE POLICY "Users can view their own experience_text" ON experience_text FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own experience_text" ON experience_text FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own experience_text" ON experience_text FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own experience_text" ON experience_text FOR DELETE USING (auth.uid() = user_id);

-- Interviews RLS
CREATE POLICY "Users can view their own interviews" ON interviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own interviews" ON interviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own interviews" ON interviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own interviews" ON interviews FOR DELETE USING (auth.uid() = user_id);

-- Search Settings RLS
CREATE POLICY "Users can view their own search_settings" ON search_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own search_settings" ON search_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own search_settings" ON search_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own search_settings" ON search_settings FOR DELETE USING (auth.uid() = user_id);

-- Search Sites RLS
CREATE POLICY "Users can view their own search_sites" ON search_sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own search_sites" ON search_sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own search_sites" ON search_sites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own search_sites" ON search_sites FOR DELETE USING (auth.uid() = user_id);

-- Skills RLS
CREATE POLICY "Users can view their own skills" ON skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own skills" ON skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own skills" ON skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own skills" ON skills FOR DELETE USING (auth.uid() = user_id);

-- Profile RLS
CREATE POLICY "Users can view their own profile" ON profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profile FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON profile FOR DELETE USING (auth.uid() = user_id);
