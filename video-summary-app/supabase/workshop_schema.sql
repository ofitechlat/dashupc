-- =============================================
-- WORKSHOP MANAGEMENT SYSTEM SCHEMA
-- =============================================

-- Tabla de Grupos de Talleres
CREATE TABLE IF NOT EXISTS public.workshop_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES public.tutors(id) ON DELETE SET NULL,
    schedule_config JSONB NOT NULL DEFAULT '[]', -- [{ "day": "Lunes", "startTime": "18:00", "endTime": "20:00" }]
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_students INTEGER DEFAULT 10,
    status TEXT CHECK (status IN ('planning', 'active', 'completed', 'cancelled')) DEFAULT 'planning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vincular solicitudes de curso a grupos específicos si es necesario
ALTER TABLE public.course_requests ADD COLUMN IF NOT EXISTS workshop_group_id UUID REFERENCES public.workshop_groups(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.workshop_groups ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
CREATE POLICY "Workshops viewable by all" ON public.workshop_groups FOR SELECT USING (true);

-- Políticas de edición para admin
CREATE POLICY "Workshops full access by authenticated" ON public.workshop_groups FOR ALL USING (auth.role() = 'authenticated');
