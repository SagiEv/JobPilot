-- Bank of roles and tags (shared/global, no RLS needed)
CREATE TABLE IF NOT EXISTS roles_dictionary (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT -- e.g., 'role', 'tag'
);

-- Relational table for tracking user experience
CREATE TABLE IF NOT EXISTS user_experiences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles_dictionary(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('current', 'previous')),
  years INTEGER,
  start_date DATE,
  end_date DATE
);

-- Seed initial roles
INSERT INTO roles_dictionary (name, category) VALUES
  ('Software Engineer', 'role'),
  ('Frontend Developer', 'role'),
  ('Backend Developer', 'role'),
  ('Fullstack Developer', 'role'),
  ('DevOps Engineer', 'role'),
  ('Data Scientist', 'role'),
  ('Product Manager', 'role'),
  ('UI', 'tag'),
  ('UX', 'tag')
ON CONFLICT (name) DO NOTHING;

-- roles_dictionary is a shared lookup table, allow all authenticated users to read
ALTER TABLE roles_dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view roles_dictionary" ON roles_dictionary FOR SELECT USING (true);

-- user_experiences: each user can only access their own
ALTER TABLE user_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own experiences" ON user_experiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own experiences" ON user_experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own experiences" ON user_experiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own experiences" ON user_experiences FOR DELETE USING (auth.uid() = user_id);
