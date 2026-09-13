-- Bank of roles and tags
CREATE TABLE IF NOT EXISTS roles_dictionary (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT -- e.g., 'role', 'tag'
);

-- Relational table for tracking user experience
CREATE TABLE IF NOT EXISTS user_experiences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL, -- Link to user
  role_id INTEGER REFERENCES roles_dictionary(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('current', 'previous')),
  years INTEGER, -- Manual override (e.g., 0 for no experience, 1, 2...)
  start_date DATE, -- Optional: used to dynamically calculate duration
  end_date DATE    -- Optional: marks the end of previous roles
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
