-- Add fields to support enhanced block sharing system
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS actual_estimated_minutes integer,
ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'academic',
ADD COLUMN IF NOT EXISTS block_position integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS shared_block_id uuid,
ADD COLUMN IF NOT EXISTS buffer_time_minutes integer DEFAULT 0;

-- Create index for shared blocks
CREATE INDEX IF NOT EXISTS idx_assignments_shared_block ON public.assignments(shared_block_id);

-- Create function to auto-estimate time based on title patterns
CREATE OR REPLACE FUNCTION public.estimate_task_time(title text, estimated_minutes integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  -- If estimated_minutes is already provided and reasonable, use it
  IF estimated_minutes IS NOT NULL AND estimated_minutes > 0 THEN
    RETURN estimated_minutes;
  END IF;
  
  -- Pattern-based estimation
  IF title ILIKE '%syllabus%' THEN
    RETURN 10;
  ELSIF title ILIKE '%recipe%' THEN
    RETURN 8;
  ELSIF title ILIKE '%review%' AND (title ILIKE '%form%' OR title ILIKE '%checklist%') THEN
    RETURN 5;
  ELSIF title ILIKE '%check%' OR title ILIKE '%verify%' THEN
    RETURN 5;
  ELSIF title ILIKE '%read%' AND length(title) < 50 THEN
    RETURN 15;
  ELSIF title ILIKE '%worksheet%' OR title ILIKE '%assignment%' THEN
    RETURN 30;
  ELSIF title ILIKE '%project%' OR title ILIKE '%essay%' THEN
    RETURN 45;
  ELSE
    -- Default based on title length and complexity
    RETURN CASE 
      WHEN length(title) < 30 THEN 15
      WHEN length(title) < 60 THEN 30
      ELSE 45
    END;
  END IF;
END;
$$;

-- Create function to classify task type based on content
CREATE OR REPLACE FUNCTION public.classify_task_type(title text, course_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Administrative tasks
  IF title ILIKE '%fee%' OR title ILIKE '%payment%' OR title ILIKE '%form%' OR 
     title ILIKE '%permission%' OR title ILIKE '%bring%' OR title ILIKE '%deliver%' OR
     title ILIKE '%submit form%' OR title ILIKE '%turn in%' THEN
    RETURN 'administrative';
  END IF;
  
  -- Quick review tasks
  IF title ILIKE '%syllabus%' OR title ILIKE '%recipe%' OR 
     title ILIKE '%check%' OR (title ILIKE '%review%' AND length(title) < 40) THEN
    RETURN 'quick_review';
  END IF;
  
  -- Default to academic
  RETURN 'academic';
END;
$$;

-- Update existing assignments with estimated times and task types
UPDATE public.assignments 
SET 
  actual_estimated_minutes = estimate_task_time(title, estimated_time_minutes),
  task_type = classify_task_type(title, course_name)
WHERE actual_estimated_minutes IS NULL OR task_type = 'academic';

-- Create trigger to auto-classify new assignments
CREATE OR REPLACE FUNCTION public.auto_classify_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set actual estimated minutes
  NEW.actual_estimated_minutes = estimate_task_time(NEW.title, NEW.estimated_time_minutes);
  
  -- Set task type
  NEW.task_type = classify_task_type(NEW.title, NEW.course_name);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_classify_assignment_trigger ON public.assignments;
CREATE TRIGGER auto_classify_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_classify_assignment();