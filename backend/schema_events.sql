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
