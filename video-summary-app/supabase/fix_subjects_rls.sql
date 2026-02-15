-- POLICY FIX: Allow deletion of subjects (required for Admin management)
-- Ejecutar en el SQL Editor de Supabase
CREATE POLICY "Subjects delete by everyone" ON public.subjects FOR DELETE USING (true);
