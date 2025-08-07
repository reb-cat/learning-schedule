-- Add instructions column to assignments table
ALTER TABLE public.assignments 
ADD COLUMN instructions text DEFAULT null;