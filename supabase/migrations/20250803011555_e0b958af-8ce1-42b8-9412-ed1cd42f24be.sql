-- Add manual assignment fields to assignments table
ALTER TABLE public.assignments 
ADD COLUMN assignment_type TEXT DEFAULT 'academic',
ADD COLUMN source TEXT DEFAULT 'canvas',
ADD COLUMN recurrence_pattern JSONB,
ADD COLUMN notes TEXT,
ADD COLUMN priority TEXT DEFAULT 'medium',
ADD COLUMN is_template BOOLEAN DEFAULT false,
ADD COLUMN parent_assignment_id UUID REFERENCES public.assignments(id);

-- Add check constraints for new fields
ALTER TABLE public.assignments 
ADD CONSTRAINT check_assignment_type 
CHECK (assignment_type IN ('academic', 'life_skills', 'tutoring', 'recurring'));

ALTER TABLE public.assignments 
ADD CONSTRAINT check_source 
CHECK (source IN ('canvas', 'manual'));

ALTER TABLE public.assignments 
ADD CONSTRAINT check_priority 
CHECK (priority IN ('high', 'medium', 'low'));

-- Create index for better performance on recurring assignments
CREATE INDEX idx_assignments_parent_id ON public.assignments(parent_assignment_id);
CREATE INDEX idx_assignments_is_template ON public.assignments(is_template);
CREATE INDEX idx_assignments_source ON public.assignments(source);