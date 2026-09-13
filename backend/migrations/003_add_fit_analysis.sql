-- Add deterministic score column
ALTER TABLE applications 
ADD COLUMN fit_score_deterministic INTEGER CHECK (fit_score_deterministic >= 0 AND fit_score_deterministic <= 100);

-- Add AI analysis JSONB column
ALTER TABLE applications 
ADD COLUMN fit_analysis_ai JSONB;

-- Create an index to speed up analytics queries filtering by fit score
CREATE INDEX idx_applications_fit_score ON applications(fit_score_deterministic);
