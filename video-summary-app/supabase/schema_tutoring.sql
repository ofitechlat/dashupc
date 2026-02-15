-- =============================================
-- TUTORING MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- =============================================

-- Tabla: subjects (Materias)
-- Tabla: subjects (Materias)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT, -- 'Educación Abierta', 'Bachillerato EDAD', 'Universitario', etc.
    level TEXT,    -- 'III Ciclo', 'I Ciclo', etc.
    syllabus JSONB DEFAULT '[]'::jsonb,
    moodle_link TEXT,
    individual_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    group_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: students (Estudiantes)
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    availability JSONB DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: tutors (Tutores)
CREATE TABLE IF NOT EXISTS tutors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    subject_ids UUID[] DEFAULT '{}',
    level_specialties TEXT[] DEFAULT '{}', -- ['III Ciclo', 'Bachillerato']
    availability JSONB DEFAULT '[]'::jsonb,
    hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    score INTEGER DEFAULT 100, -- Puntuación para prioridad (0-100)
    max_hours INTEGER DEFAULT 40, -- Límite de horas semanales
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: course_requests (Solicitudes de Cursos)
CREATE TABLE IF NOT EXISTS course_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    package_hours INTEGER DEFAULT 1, -- Cantidad de horas solicitadas (1, 4, 8, 10...)
    preference TEXT CHECK (preference IN ('individual', 'grupal')) DEFAULT 'grupal',
    status TEXT CHECK (status IN ('pending', 'matched', 'cancelled', 'rejected')) DEFAULT 'pending',
    rejection_reason TEXT,
    proposed_schedule JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: classes (Clases/Tutorías)
CREATE TABLE IF NOT EXISTS classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID, -- Identificador para agrupar estudiantes en una misma sesión
    is_open BOOLEAN DEFAULT TRUE, -- Si admite más estudiantes
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    tutor_id UUID REFERENCES tutors(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    type TEXT CHECK (type IN ('individual', 'grupal')) DEFAULT 'grupal',
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
    video_id TEXT, -- Referencia al video de la clase (tabla videos existente)
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    student_confirmed BOOLEAN DEFAULT FALSE,
    tutor_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columna class_id a la tabla videos existente
ALTER TABLE videos ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_tutors_phone ON tutors(phone);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_scheduled ON classes(scheduled_at);

-- RLS Policies (Read público, Write solo admin)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
CREATE POLICY "Subjects are viewable by everyone" ON subjects FOR SELECT USING (true);
CREATE POLICY "Students are viewable by everyone" ON students FOR SELECT USING (true);
CREATE POLICY "Tutors are viewable by everyone" ON tutors FOR SELECT USING (true);
CREATE POLICY "Classes are viewable by everyone" ON classes FOR SELECT USING (true);

-- Políticas de escritura (requiere autenticación)
CREATE POLICY "Subjects insert by authenticated" ON subjects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Subjects update by authenticated" ON subjects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Students insert by anyone" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students update by anyone" ON students FOR UPDATE USING (true);
CREATE POLICY "Tutors insert by authenticated" ON tutors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tutors update by authenticated" ON tutors FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Classes insert by authenticated" ON classes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Classes update by authenticated" ON classes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Classes delete by everyone" ON classes FOR DELETE USING (true);
