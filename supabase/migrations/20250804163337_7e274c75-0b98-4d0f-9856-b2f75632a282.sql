-- First, drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS auto_classify_assignment_trigger ON assignments;
DROP TRIGGER IF EXISTS auto_classify_assignment_staging_trigger ON assignments_staging;

-- Create the missing function
CREATE OR REPLACE FUNCTION public.estimate_task_time(title text, estimated_minutes integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF estimated_minutes IS NOT NULL AND estimated_minutes > 0 THEN
    RETURN estimated_minutes;
  END IF;
  
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
    RETURN CASE 
      WHEN length(title) < 30 THEN 15
      WHEN length(title) < 60 THEN 30
      ELSE 45
    END;
  END IF;
END;
$function$;

-- Recreate the auto_classify_assignment function
CREATE OR REPLACE FUNCTION public.auto_classify_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.actual_estimated_minutes = estimate_task_time(NEW.title, NEW.estimated_time_minutes);
  NEW.task_type = classify_task_type(NEW.title, NEW.course_name);
  RETURN NEW;
END;
$function$;

-- Recreate the triggers
CREATE TRIGGER auto_classify_assignment_trigger
  BEFORE INSERT OR UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_classify_assignment();

CREATE TRIGGER auto_classify_assignment_staging_trigger
  BEFORE INSERT OR UPDATE ON assignments_staging
  FOR EACH ROW
  EXECUTE FUNCTION auto_classify_assignment();