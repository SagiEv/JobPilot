-- 1. Add rejection details to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS automatic_rejection BOOLEAN DEFAULT FALSE;
