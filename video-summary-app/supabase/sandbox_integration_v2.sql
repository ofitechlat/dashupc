-- =============================================
-- SANDBOX INTEGRATION MIGRATION V2 (Final)
-- Based on Schema Inspection 2026-01-25
-- =============================================

-- 1. Create 'terms' table (Does not exist)
CREATE TABLE IF NOT EXISTS terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for terms
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Terms" ON terms FOR SELECT USING (true);
CREATE POLICY "Admin Write Terms" ON terms FOR ALL USING (auth.role() = 'authenticated');

-- 2. Update 'subjects' table (Missing 'code')
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- 3. Update 'students' table (Missing 'term_id')
ALTER TABLE students ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id) ON DELETE SET NULL;

-- 4. Update 'classes' table (Missing 'term_id')
ALTER TABLE classes ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id) ON DELETE SET NULL;

-- =============================================
-- DATA SEEDING (Idempotent)
-- =============================================

-- A. Insert Default Term
INSERT INTO terms (name, start_date, end_date, deadline, is_active)
SELECT 'Tanda Febrero 2026', '2026-02-02', '2026-02-28', '2026-01-25', TRUE
WHERE NOT EXISTS (SELECT 1 FROM terms WHERE name = 'Tanda Febrero 2026');

-- B. Auto-generate Codes for existing Subjects (Simple heuristics)
-- UPDATE subjects SET code = 'MAT_7' WHERE name ILIKE '%Matemáticas%7%' AND code IS NULL;
-- UPDATE subjects SET code = 'ESP_8' WHERE name ILIKE '%Español%8%' AND code IS NULL;
-- (Users should manually update codes if complex logic is needed, but here are some safe defaults)

UPDATE subjects SET code = 'MAT_7' WHERE name = 'Matemáticas' AND level = 'Sétimo' AND code IS NULL;
UPDATE subjects SET code = 'ESP_7' WHERE name = 'Español' AND level = 'Sétimo' AND code IS NULL;
UPDATE subjects SET code = 'CIE_7' WHERE name = 'Ciencias' AND level = 'Sétimo' AND code IS NULL;
UPDATE subjects SET code = 'EST_7' WHERE name = 'Estudios Sociales' AND level = 'Sétimo' AND code IS NULL;
UPDATE subjects SET code = 'ING_7' WHERE name = 'Inglés' AND level = 'Sétimo' AND code IS NULL;

-- C. Assign all current students to the new active term (start fresh)
UPDATE students 
SET term_id = (SELECT id FROM terms WHERE is_active = TRUE LIMIT 1) 
WHERE term_id IS NULL;
