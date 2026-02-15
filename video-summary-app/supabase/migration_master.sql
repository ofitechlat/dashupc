-- =============================================
-- MIGRACIÓN COMPLETA: ACADEMIA UPC
-- Fecha: 2026-01-25
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- ========== PARTE 1: ACTUALIZAR TABLAS EXISTENTES ==========

-- 1.1 Agregar columnas faltantes a SUBJECTS
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS code text UNIQUE;

-- 1.2 Agregar columnas faltantes a STUDENTS
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS level text; -- "Sétimo", "Octavo", etc.

-- ========== PARTE 2: CREAR TABLAS NUEVAS ==========

-- 2.1 Tabla TERMS (Tandas/Periodos Académicos)
CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date,
  end_date date,
  deadline date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2.2 Tabla PROGRAMS (Productos/Planes de Estudio)
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text CHECK (type IN ('cohort', 'on_demand', 'workshop')),
  description text,
  level text, -- "Sétimo", "Octavo", etc. para filtrar materias
  syllabus jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2.3 Tabla PROGRAM_STRUCTURE (Reglas de Horas por Materia)
CREATE TABLE IF NOT EXISTS public.program_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  weekly_hours integer NOT NULL DEFAULT 1,
  monthly_hours_cap integer GENERATED ALWAYS AS (weekly_hours * 4) STORED,
  UNIQUE(program_id, subject_id)
);

-- 2.4 Tabla ENROLLMENTS (Inscripciones de Estudiantes a Programas)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.terms(id) ON DELETE SET NULL,
  cohort_id uuid,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, program_id, term_id)
);

-- 2.5 Tabla CLASS_AUDITS (Auditoría de Clases con IA)
CREATE TABLE IF NOT EXISTS public.class_audits (
  class_id uuid PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  transcription_summary text,
  detected_topics jsonb DEFAULT '[]',
  syllabus_match_score numeric(5,2),
  planned_topic text,
  manual_override_topic text,
  flagged_alert boolean DEFAULT false,
  alert_reason text,
  created_at timestamptz DEFAULT now()
);

-- 2.6 Agregar FK a tablas existentes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES public.terms(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES public.terms(id);

-- ========== PARTE 3: INSERTAR DATOS BASE ==========

-- 3.1 Insertar Tanda Activa
INSERT INTO public.terms (name, start_date, end_date, deadline, is_active)
VALUES ('Tanda Febrero 2026', '2026-02-03', '2026-02-28', '2026-01-27', true)
ON CONFLICT DO NOTHING;

-- 3.2 Insertar Programas (Niveles)
INSERT INTO public.programs (name, type, level, description) VALUES
  ('Plan Mensual Sétimo', 'cohort', 'Sétimo', 'III Ciclo - Sétimo Año - Educación Abierta'),
  ('Plan Mensual Octavo', 'cohort', 'Octavo', 'III Ciclo - Octavo Año - Educación Abierta'),
  ('Plan Mensual Noveno', 'cohort', 'Noveno', 'III Ciclo - Noveno Año - Educación Abierta'),
  ('Bachillerato EDAD', 'cohort', 'Bachillerato', 'Bachillerato por Madurez - Educación Abierta')
ON CONFLICT DO NOTHING;

-- 3.3 Insertar Materias Base (si no existen)
-- Usamos INSERT ... ON CONFLICT para no duplicar

-- SÉTIMO
INSERT INTO public.subjects (name, level, code, category, individual_price, group_price) VALUES
  ('Matemáticas', 'Sétimo', 'MAT_7', 'III Ciclo', 15000, 8000),
  ('Español', 'Sétimo', 'ESP_7', 'III Ciclo', 15000, 8000),
  ('Ciencias', 'Sétimo', 'CIE_7', 'III Ciclo', 15000, 8000),
  ('Estudios Sociales', 'Sétimo', 'EST_7', 'III Ciclo', 15000, 8000),
  ('Inglés', 'Sétimo', 'ING_7', 'III Ciclo', 15000, 8000)
ON CONFLICT (code) DO NOTHING;

-- OCTAVO
INSERT INTO public.subjects (name, level, code, category, individual_price, group_price) VALUES
  ('Matemáticas', 'Octavo', 'MAT_8', 'III Ciclo', 15000, 8000),
  ('Español', 'Octavo', 'ESP_8', 'III Ciclo', 15000, 8000),
  ('Ciencias', 'Octavo', 'CIE_8', 'III Ciclo', 15000, 8000),
  ('Estudios Sociales', 'Octavo', 'EST_8', 'III Ciclo', 15000, 8000),
  ('Inglés', 'Octavo', 'ING_8', 'III Ciclo', 15000, 8000)
ON CONFLICT (code) DO NOTHING;

-- NOVENO
INSERT INTO public.subjects (name, level, code, category, individual_price, group_price) VALUES
  ('Matemáticas', 'Noveno', 'MAT_9', 'III Ciclo', 15000, 8000),
  ('Español', 'Noveno', 'ESP_9', 'III Ciclo', 15000, 8000),
  ('Ciencias', 'Noveno', 'CIE_9', 'III Ciclo', 15000, 8000),
  ('Estudios Sociales', 'Noveno', 'EST_9', 'III Ciclo', 15000, 8000),
  ('Inglés', 'Noveno', 'ING_9', 'III Ciclo', 15000, 8000)
ON CONFLICT (code) DO NOTHING;

-- BACHILLERATO
INSERT INTO public.subjects (name, level, code, category, individual_price, group_price) VALUES
  ('Matemáticas', 'Bachillerato', 'MAT_B', 'Bachillerato', 18000, 10000),
  ('Español', 'Bachillerato', 'ESP_B', 'Bachillerato', 18000, 10000),
  ('Ciencias', 'Bachillerato', 'CIE_B', 'Bachillerato', 18000, 10000),
  ('Estudios Sociales', 'Bachillerato', 'EST_B', 'Bachillerato', 18000, 10000),
  ('Inglés', 'Bachillerato', 'ING_B', 'Bachillerato', 18000, 10000)
ON CONFLICT (code) DO NOTHING;

-- ========== PARTE 4: REGLAS DE HORAS POR PROGRAMA ==========

-- Función auxiliar para insertar reglas
-- Matemáticas y Español = 2 horas/semana, el resto = 1 hora/semana

-- SÉTIMO
INSERT INTO public.program_structure (program_id, subject_id, weekly_hours)
SELECT 
  (SELECT id FROM programs WHERE level = 'Sétimo' LIMIT 1),
  s.id,
  CASE 
    WHEN s.name IN ('Matemáticas', 'Español') THEN 2
    ELSE 1
  END
FROM subjects s WHERE s.level = 'Sétimo'
ON CONFLICT (program_id, subject_id) DO NOTHING;

-- OCTAVO
INSERT INTO public.program_structure (program_id, subject_id, weekly_hours)
SELECT 
  (SELECT id FROM programs WHERE level = 'Octavo' LIMIT 1),
  s.id,
  CASE 
    WHEN s.name IN ('Matemáticas', 'Español') THEN 2
    ELSE 1
  END
FROM subjects s WHERE s.level = 'Octavo'
ON CONFLICT (program_id, subject_id) DO NOTHING;

-- NOVENO
INSERT INTO public.program_structure (program_id, subject_id, weekly_hours)
SELECT 
  (SELECT id FROM programs WHERE level = 'Noveno' LIMIT 1),
  s.id,
  CASE 
    WHEN s.name IN ('Matemáticas', 'Español') THEN 2
    ELSE 1
  END
FROM subjects s WHERE s.level = 'Noveno'
ON CONFLICT (program_id, subject_id) DO NOTHING;

-- BACHILLERATO (Todas 2 horas por ser más intensivo)
INSERT INTO public.program_structure (program_id, subject_id, weekly_hours)
SELECT 
  (SELECT id FROM programs WHERE level = 'Bachillerato' LIMIT 1),
  s.id,
  2 -- Bachillerato = 2h para todas
FROM subjects s WHERE s.level = 'Bachillerato'
ON CONFLICT (program_id, subject_id) DO NOTHING;

-- ========== PARTE 5: SEGURIDAD (RLS) ==========

ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_audits ENABLE ROW LEVEL SECURITY;

-- Políticas de Lectura Pública
CREATE POLICY "Terms viewable by all" ON terms FOR SELECT USING (true);
CREATE POLICY "Programs viewable by all" ON programs FOR SELECT USING (true);
CREATE POLICY "Structure viewable by all" ON program_structure FOR SELECT USING (true);
CREATE POLICY "Enrollments viewable by all" ON enrollments FOR SELECT USING (true);
CREATE POLICY "Audits viewable by all" ON class_audits FOR SELECT USING (true);

-- Políticas de Escritura (requiere auth)
CREATE POLICY "Terms writable by authenticated" ON terms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Programs writable by authenticated" ON programs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Structure writable by authenticated" ON program_structure FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enrollments writable by all" ON enrollments FOR ALL USING (true); -- Estudiantes pueden inscribirse
CREATE POLICY "Audits writable by authenticated" ON class_audits FOR ALL USING (auth.role() = 'authenticated');

-- ========== FIN DE MIGRACIÓN ==========
-- Verificar ejecución con:
-- SELECT * FROM programs;
-- SELECT * FROM subjects WHERE code IS NOT NULL;
-- SELECT * FROM program_structure;
