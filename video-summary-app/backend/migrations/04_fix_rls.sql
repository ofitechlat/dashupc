-- Enable RLS on tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "student_view_self" ON students;
DROP POLICY IF EXISTS "admin_view_all_students" ON students;
DROP POLICY IF EXISTS "student_view_own_requests" ON course_requests;
DROP POLICY IF EXISTS "student_insert_own_requests" ON course_requests;
DROP POLICY IF EXISTS "admin_view_all_requests" ON course_requests;
DROP POLICY IF EXISTS "student_view_own_classes" ON classes;
DROP POLICY IF EXISTS "admin_view_all_classes" ON classes;

-- STUDENTS POLICIES
CREATE POLICY "student_view_self" ON students FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "admin_view_all_students" ON students FOR ALL
USING ((auth.jwt() ->> 'email') = '506casm@gmail.com');

-- COURSE_REQUESTS POLICIES
CREATE POLICY "student_view_own_requests" ON course_requests FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM students WHERE id = student_id));

CREATE POLICY "student_insert_own_requests" ON course_requests FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM students WHERE id = student_id));

CREATE POLICY "admin_view_all_requests" ON course_requests FOR ALL
USING ((auth.jwt() ->> 'email') = '506casm@gmail.com');

-- CLASSES POLICIES
CREATE POLICY "student_view_own_classes" ON classes FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM students WHERE id = student_id));

CREATE POLICY "admin_view_all_classes" ON classes FOR ALL
USING ((auth.jwt() ->> 'email') = '506casm@gmail.com');
