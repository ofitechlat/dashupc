-- =============================================
-- REGISTRATION BY OBJECTIVES SUPPORT
-- =============================================

-- 1. Agregar soporte para múltiples materias y periodos en solicitudes
ALTER TABLE public.course_requests 
ADD COLUMN IF NOT EXISTS subject_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT '[]'; -- Para guardar metas específicas como "Bachillerato en 3 meses"

-- 2. Asegurar que RLS permita ver términos a todos (ya está en migration_master, pero por si acaso)
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Terms viewable by all" ON public.terms;
CREATE POLICY "Terms viewable by all" ON public.terms FOR SELECT USING (true);

-- 3. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_course_requests_term_id ON public.course_requests(term_id);
