-- Drop the existing restrictive check constraint
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_category_check;

-- Add a new check constraint that allows proper categories
ALTER TABLE public.assignments 
ADD CONSTRAINT assignments_category_check 
CHECK (category IN ('academic', 'administrative', 'life_skills', 'volunteer', 'tutoring', 'recurring'));

-- Update existing records to have proper categories based on assignment_type
UPDATE public.assignments 
SET category = CASE 
  WHEN assignment_type = 'volunteer_events' THEN 'volunteer'
  WHEN assignment_type = 'life_skills' THEN 'life_skills'
  WHEN assignment_type = 'tutoring' THEN 'tutoring'
  WHEN assignment_type = 'recurring' THEN 'recurring'
  WHEN assignment_type = 'academic' THEN 'academic'
  ELSE 'academic'
END;