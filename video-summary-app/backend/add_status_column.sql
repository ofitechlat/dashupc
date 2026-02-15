-- Add processing_status column to track partial completions
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed';

-- Update existing records to 'completed'
UPDATE videos SET processing_status = 'completed' WHERE processing_status IS NULL;
