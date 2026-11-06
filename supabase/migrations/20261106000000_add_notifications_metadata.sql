-- Migration: Add metadata and reverted columns to notifications table
-- Run this in Supabase SQL Editor

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reverted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_reverted ON notifications(reverted);

