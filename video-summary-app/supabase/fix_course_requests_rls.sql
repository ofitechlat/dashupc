-- =============================================
-- FIX RLS FOR COURSE_REQUESTS
-- Permitir inserción pública para el formulario de registro
-- =============================================

-- Habilitar RLS
ALTER TABLE public.course_requests ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Allow public insert to course_requests" ON public.course_requests;
DROP POLICY IF EXISTS "Allow public read to course_requests" ON public.course_requests;

-- Crear nuevas políticas
CREATE POLICY "Allow public insert to course_requests" 
    ON public.course_requests FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public read to course_requests" 
    ON public.course_requests FOR SELECT 
    USING (true);

CREATE POLICY "Allow authenticated update to course_requests" 
    ON public.course_requests FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete to course_requests" 
    ON public.course_requests FOR DELETE 
    USING (auth.role() = 'authenticated');
