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
