-- 1. ADD MISSING COLUMNS (Payment & Tracking)
-- Based on the schema you provided, these columns are necessary for the Admin/Payment features to work.

-- Link Classes to the Request (Package) they belong to
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.course_requests(id);

-- Add Payment Tracking to Course Requests
ALTER TABLE public.course_requests 
ADD COLUMN IF NOT EXISTS total_price numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue'));

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- This ensures students can only see their own data.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 3. DEFINE POLICIES (Access Rules)

-- STUDENTS TABLE
-- Allow students to view their own profile
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
CREATE POLICY "Students can view own profile" 
ON public.students FOR SELECT 
USING (auth.uid() = user_id);

-- Allow Admins (or anyone with the right email/role) to view all students
-- Adjust the email to match your specific admin email if needed, or allow service_role to bypass (default)
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
CREATE POLICY "Admins can view all students" 
ON public.students FOR SELECT 
USING (auth.jwt() ->> 'email' = '506casm@gmail.com'); 

-- COURSE REQUESTS TABLE
-- Allow students to view their own requests (Linked via Student ID)
DROP POLICY IF EXISTS "Students can view own requests" ON public.course_requests;
CREATE POLICY "Students can view own requests" 
ON public.course_requests FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.students WHERE id = course_requests.student_id
  )
);

-- Allow students to create requests
DROP POLICY IF EXISTS "Students can create requests" ON public.course_requests;
CREATE POLICY "Students can create requests" 
ON public.course_requests FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.students WHERE id = course_requests.student_id
  )
);

-- CLASSES TABLE
-- Allow students to view their own classes
DROP POLICY IF EXISTS "Students can view own classes" ON public.classes;
CREATE POLICY "Students can view own classes" 
ON public.classes FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.students WHERE id = classes.student_id
  )
);

-- Allow Admins to do everything on classes
DROP POLICY IF EXISTS "Admins full access classes" ON public.classes;
CREATE POLICY "Admins full access classes" 
ON public.classes FOR ALL
USING (auth.jwt() ->> 'email' = '506casm@gmail.com');

-- 4. GRANT PERMISSIONS
-- Ensure the authenticated user role has permission to interact with tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
