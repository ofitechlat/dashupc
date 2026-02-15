-- =============================================
-- FIX RLS FOR CLASSES
-- Permitir eliminación de clases por usuarios autenticados (admin)
-- =============================================

-- Asegurar que RLS está habilitado
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Eliminar política antigua si existe (para evitar duplicados o conflictos)
DROP POLICY IF EXISTS "Classes delete by everyone" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated delete to classes" ON public.classes;

-- Crear política correcta para permitir borrar
CREATE POLICY "Allow authenticated delete to classes" 
    ON public.classes FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Asegurar políticas de lectura/escritura correctas también
DROP POLICY IF EXISTS "Classes insert by authenticated" ON public.classes;
CREATE POLICY "Classes insert by authenticated" ON public.classes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Classes update by authenticated" ON public.classes;
CREATE POLICY "Classes update by authenticated" ON public.classes FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Classes are viewable by everyone" ON public.classes;
CREATE POLICY "Classes are viewable by everyone" ON public.classes FOR SELECT USING (true);
