-- Add completion status and progress tracking columns to assignments table
ALTER TABLE public.assignments 
ADD COLUMN completion_status text DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed', 'stuck')),
ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN time_spent_minutes integer DEFAULT 0,
ADD COLUMN completion_notes text,
ADD COLUMN stuck_reason text;

-- Add the same columns to assignments_staging table
ALTER TABLE public.assignments_staging 
ADD COLUMN completion_status text DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed', 'stuck')),
ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN time_spent_minutes integer DEFAULT 0,
ADD COLUMN completion_notes text,
ADD COLUMN stuck_reason text;

-- Create an index for efficient querying by completion status
CREATE INDEX idx_assignments_completion_status ON public.assignments(completion_status);
CREATE INDEX idx_assignments_staging_completion_status ON public.assignments_staging(completion_status);