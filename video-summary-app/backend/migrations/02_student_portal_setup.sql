-- Migration for Student Portal & Scheduling Upgrades

-- 1. Add user_id and must_change_password to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

-- 2. Add rejection_reason and proposed_schedule to course_requests
ALTER TABLE course_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS proposed_schedule JSONB DEFAULT '[]'::jsonb;

-- 3. Update status check constraint to include 'rejected'
ALTER TABLE course_requests DROP CONSTRAINT IF EXISTS course_requests_status_check;
ALTER TABLE course_requests ADD CONSTRAINT course_requests_status_check 
CHECK (status IN ('pending', 'matched', 'cancelled', 'rejected'));

-- 4. Add index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
