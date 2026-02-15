-- =============================================
-- ACTUALIZAR POLÍTICAS RLS PARA PERMITIR INSERTS PÚBLICOS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Eliminar políticas antiguas de INSERT
DROP POLICY IF EXISTS "Subjects insert by authenticated" ON subjects;
DROP POLICY IF EXISTS "Students insert by anyone" ON students;
DROP POLICY IF EXISTS "Tutors insert by authenticated" ON tutors;
DROP POLICY IF EXISTS "Classes insert by authenticated" ON classes;

-- Crear nuevas políticas que permiten INSERT público
CREATE POLICY "Subjects insert by anyone" ON subjects 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Subjects update by anyone" ON subjects 
    FOR UPDATE 
    USING (true);

CREATE POLICY "Students insert public" ON students 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Students update public" ON students 
    FOR UPDATE 
    USING (true);

CREATE POLICY "Tutors insert public" ON tutors 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Tutors update public" ON tutors 
    FOR UPDATE 
    USING (true);

CREATE POLICY "Classes insert public" ON classes 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Classes update public" ON classes 
    FOR UPDATE 
    USING (true);

-- Verificar que RLS está habilitado
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
