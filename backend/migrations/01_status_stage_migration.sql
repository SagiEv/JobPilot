-- 1. Add stage column to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage TEXT;

-- 2. Link interviews to applications
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE;

-- 3. Create application_history table
CREATE TABLE IF NOT EXISTS application_history (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'Status Change', 'Stage Change', 'Interview', 'Note'
    old_status TEXT,
    new_status TEXT,
    old_stage TEXT,
    new_stage TEXT,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    with_who TEXT,
    interview_id INTEGER REFERENCES interviews(id) ON DELETE SET NULL
);

-- 4. Standardize existing statuses and set initial stages
UPDATE applications
SET 
    status = 'Applied',
    stage = NULL
WHERE LOWER(status) IN ('applied', 'submitted');

UPDATE applications
SET 
    status = 'Screening',
    stage = NULL
WHERE LOWER(status) IN ('follow_up', 'screening');

UPDATE applications
SET 
    status = 'Assessment',
    stage = NULL
WHERE LOWER(status) IN ('assessment');

UPDATE applications
SET 
    status = 'Interviewing',
    stage = 'Recruiter / HR Screen'
WHERE LOWER(status) IN ('phone interview');

UPDATE applications
SET 
    status = 'Interviewing',
    stage = 'Technical Interview'
WHERE LOWER(status) IN ('technical interview');

UPDATE applications
SET 
    status = 'Interviewing',
    stage = NULL
WHERE LOWER(status) IN ('interview', 'interviewing') 
  AND LOWER(status) NOT IN ('phone interview', 'technical interview');

UPDATE applications
SET 
    status = 'Offer',
    stage = NULL
WHERE LOWER(status) IN ('offer');

UPDATE applications
SET 
    status = 'Rejected',
    stage = NULL
WHERE LOWER(status) LIKE '%reject%';

-- Populate application_history with initial state for existing records
INSERT INTO application_history (application_id, event_type, new_status, new_stage, event_date, notes)
SELECT id, 'Initial Import', status, stage, date, 'Migrated to new status/stage structure'
FROM applications;

-- 5. Enable RLS and create policies for application_history
ALTER TABLE application_history ENABLE ROW LEVEL SECURITY;

-- Allow users to view history for their own applications
CREATE POLICY "Users can view their own application history"
ON application_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_history.application_id
        AND applications.user_id = auth.uid()
    )
);

-- Allow users to insert history for their own applications
CREATE POLICY "Users can insert their own application history"
ON application_history FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_history.application_id
        AND applications.user_id = auth.uid()
    )
);

-- Allow users to update history for their own applications
CREATE POLICY "Users can update their own application history"
ON application_history FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_history.application_id
        AND applications.user_id = auth.uid()
    )
);

-- Allow users to delete history for their own applications
CREATE POLICY "Users can delete their own application history"
ON application_history FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM applications
        WHERE applications.id = application_history.application_id
        AND applications.user_id = auth.uid()
    )
);
