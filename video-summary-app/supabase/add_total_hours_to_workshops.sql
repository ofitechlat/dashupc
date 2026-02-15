-- Add total_hours column to workshop_groups
ALTER TABLE public.workshop_groups ADD COLUMN IF NOT EXISTS total_hours INTEGER DEFAULT 0;

-- Update existing rows (optional, set a default if needed, or leave as 0)
-- UPDATE public.workshop_groups SET total_hours = 12 WHERE total_hours IS NULL;
