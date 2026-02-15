-- Migration for Payment Tracking & Class Linkage

-- 1. Add request_id to classes to link sessions to the original financial request
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES course_requests(id) ON DELETE SET NULL;

-- 2. Add payment tracking fields to course_requests
ALTER TABLE course_requests
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')) DEFAULT 'pending';

-- 3. Update existing confirmed classes to have a status (if missing)
-- (No specific update needed for existing rows as new columns have defaults or are nullable)
