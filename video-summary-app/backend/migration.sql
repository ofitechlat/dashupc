-- Script de migración para actualizar la estructura de la base de datos
-- Ejecutar en el Editor SQL de Supabase

-- 1. Agregar columna category a subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Agregar columnas score y max_hours a tutors
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 100;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS max_hours INTEGER DEFAULT 40;

-- 3. Agregar columnas group_id e is_open a classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE;

-- 4. Crear tabla course_requests si no existe
CREATE TABLE IF NOT EXISTS course_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    package_hours INTEGER DEFAULT 1, -- Cantidad de horas solicitadas (1, 4, 8, 10...)
    max_daily_hours INTEGER DEFAULT 2, -- REQUERIMIENTO NUEVO: Máximo de horas por día para esta materia
    preference TEXT CHECK (preference IN ('individual', 'grupal')) DEFAULT 'grupal',
    status TEXT CHECK (status IN ('pending', 'matched', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la tabla ya EXISTE (porque el usuario corrió el SQL anterior), agregamos la columna manualmente
ALTER TABLE course_requests ADD COLUMN IF NOT EXISTS max_daily_hours INTEGER DEFAULT 2;

-- 5. Actualizar permisos RLS para la nueva tabla
ALTER TABLE course_requests ENABLE ROW LEVEL SECURITY;

-- Lectura pública (o restringida a auth user si prefieres)
CREATE POLICY "Course requests viewable by everyone" ON course_requests FOR SELECT USING (true);
-- Escritura (insert) pública o autenticada
CREATE POLICY "Course requests insert by anyone" ON course_requests FOR INSERT WITH CHECK (true);
-- Update solo admin/autenticado
CREATE POLICY "Course requests update by authenticated" ON course_requests FOR UPDATE USING (auth.role() = 'authenticated');
