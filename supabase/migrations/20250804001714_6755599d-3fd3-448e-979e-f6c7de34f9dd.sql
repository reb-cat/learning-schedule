-- Add columns to assignments table for module and quiz support
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS module_id TEXT,
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'assignment',
ADD COLUMN IF NOT EXISTS module_position INTEGER,
ADD COLUMN IF NOT EXISTS quiz_type TEXT;