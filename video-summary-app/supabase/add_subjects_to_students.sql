-- =============================================
-- ADD SUBJECT_IDS TO STUDENTS TABLE
-- =============================================
-- Run this in Supabase SQL Editor

-- Add subject_ids column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS subject_ids UUID[] DEFAULT '{}';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'subject_ids';
