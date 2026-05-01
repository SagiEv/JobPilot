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
  date TEXT,
  status TEXT,
  location TEXT,
  info TEXT,
  referal TEXT,
  link TEXT
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
  company TEXT,
  role TEXT,
  stage TEXT,
  date DATE,
  questions TEXT,
  keep JSONB,
  improve JSONB,
  feedback TEXT
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
