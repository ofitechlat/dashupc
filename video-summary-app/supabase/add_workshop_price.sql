-- Agregar columna price a workshop_groups
ALTER TABLE public.workshop_groups ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Opcional: Actualizar el precio de los talleres existentes basado en el precio grupal de su materia
-- UPDATE public.workshop_groups w
-- SET price = s.group_price
-- FROM public.subjects s
-- WHERE w.subject_id = s.id AND w.price = 0;
