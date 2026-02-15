-- =============================================
-- SANDBOX INTEGRATION MIGRATION
-- =============================================

-- 1. Tabla: terms (Tandas / Periodos Académicos)
CREATE TABLE IF NOT EXISTS terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- Ej: 'Tanda Febrero 2026'
    start_date DATE,
    end_date DATE,
    deadline DATE, -- Fecha límite de inscripción
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Actualizar Tabla: students (Estudiantes)
-- Agregar vinculación a una tanda específica (term_id)
ALTER TABLE students ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id) ON DELETE SET NULL;

-- 3. Actualizar Tabla: subjects (Materias)
-- Agregar código legible para mapeo fácil (ej: 'MAT_7', 'CIEN_9')
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- 4. Actualizar Tabla: classes (Clases)
-- Vincular clases a una tanda
ALTER TABLE classes ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id) ON DELETE SET NULL;

-- 5. Insertar Datos Base (Seed inicial para que funcione el Sandbox)
-- Solo si no existen conflictos

-- Insertar Tanda Ejemplo
INSERT INTO terms (name, start_date, end_date, deadline, is_active)
VALUES ('Tanda Febrero 2026', '2026-02-02', '2026-02-28', '2026-01-25', TRUE)
ON CONFLICT DO NOTHING;

-- ACTUALIZAR POLÍTICAS RLS PARA TERMS
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Terms viewable by everyone" ON terms FOR SELECT USING (true);
CREATE POLICY "Terms insert by authenticated" ON terms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
