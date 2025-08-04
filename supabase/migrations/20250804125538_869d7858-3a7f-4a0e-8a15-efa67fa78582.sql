-- Fix negative buffer_time_minutes values
UPDATE assignments_staging 
SET buffer_time_minutes = 0 
WHERE buffer_time_minutes < 0;

-- Fix function search_path security issues
ALTER FUNCTION public.update_learning_patterns SET search_path = '';
ALTER FUNCTION public.update_energy_pattern SET search_path = '';
ALTER FUNCTION public.update_updated_at_column SET search_path = '';
ALTER FUNCTION public.calculate_estimated_blocks SET search_path = '';
ALTER FUNCTION public.estimate_task_time SET search_path = '';
ALTER FUNCTION public.classify_task_type SET search_path = '';
ALTER FUNCTION public.auto_classify_assignment SET search_path = '';

-- Add proper constraints to ensure data consistency
ALTER TABLE assignments_staging 
ADD CONSTRAINT check_buffer_time_non_negative 
CHECK (buffer_time_minutes >= 0);

ALTER TABLE assignments 
ADD CONSTRAINT check_buffer_time_non_negative 
CHECK (buffer_time_minutes >= 0);

-- Ensure consistent task_type values
UPDATE assignments_staging 
SET task_type = 'academic' 
WHERE task_type IS NULL;

UPDATE assignments_staging 
SET assignment_type = 'academic' 
WHERE assignment_type IS NULL;

-- Add triggers for automatic classification
CREATE TRIGGER assignments_staging_auto_classify
    BEFORE INSERT OR UPDATE ON assignments_staging
    FOR EACH ROW
    EXECUTE FUNCTION auto_classify_assignment();