-- =============================================
-- FUNCION: Eliminar Solicitud con Limpieza en Cascada
-- =============================================

CREATE OR REPLACE FUNCTION delete_course_request_linked(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar como superusuario para ignorar RLS/Restricciones simples
AS $$
BEGIN
  -- 1. Eliminar clases vinculadas directamente a esta solicitud
  -- (Si existen clases generadas específicamente para esta solicitud)
  DELETE FROM public.classes WHERE request_id = p_request_id;

  -- 2. Eliminar la solicitud
  DELETE FROM public.course_requests WHERE id = p_request_id;
END;
$$;
