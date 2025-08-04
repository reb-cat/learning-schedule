-- Create the missing estimate_task_time function
CREATE OR REPLACE FUNCTION public.estimate_task_time(title text, estimated_minutes integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
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
$function$;

-- Now update the assignments with proper cognitive_load and urgency
UPDATE assignments 
SET 
  cognitive_load = CASE 
    WHEN title ILIKE '%syllabus%' OR title ILIKE '%recipe%' OR title ILIKE '%check%' OR title ILIKE '%review%' OR title ILIKE '%attendance%' OR title ILIKE '%bring%' THEN 'light'
    WHEN title ILIKE '%project%' OR title ILIKE '%essay%' OR title ILIKE '%research%' OR title ILIKE '%analysis%' OR title ILIKE '%exam%' OR title ILIKE '%test%' OR title ILIKE '%paper%' OR title ILIKE '%presentation%' THEN 'heavy'
    ELSE 'medium'
  END,
  urgency = CASE 
    WHEN due_date IS NULL THEN 'upcoming'
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    WHEN due_date = CURRENT_DATE THEN 'due_today'
    WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
    ELSE 'upcoming'
  END;

-- Update assignments_staging table as well
UPDATE assignments_staging 
SET 
  cognitive_load = CASE 
    WHEN title ILIKE '%syllabus%' OR title ILIKE '%recipe%' OR title ILIKE '%check%' OR title ILIKE '%review%' OR title ILIKE '%attendance%' OR title ILIKE '%bring%' THEN 'light'
    WHEN title ILIKE '%project%' OR title ILIKE '%essay%' OR title ILIKE '%research%' OR title ILIKE '%analysis%' OR title ILIKE '%exam%' OR title ILIKE '%test%' OR title ILIKE '%paper%' OR title ILIKE '%presentation%' THEN 'heavy'
    ELSE 'medium'
  END,
  urgency = CASE 
    WHEN due_date IS NULL THEN 'upcoming'
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    WHEN due_date = CURRENT_DATE THEN 'due_today'
    WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
    ELSE 'upcoming'
  END;