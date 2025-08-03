-- Add missing columns for assignment scheduling
ALTER TABLE public.assignments 
ADD COLUMN scheduled_block INTEGER,
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_day TEXT;

-- Add index for better performance when querying scheduled assignments
CREATE INDEX idx_assignments_scheduled ON public.assignments(student_name, scheduled_date, scheduled_block) WHERE scheduled_block IS NOT NULL;