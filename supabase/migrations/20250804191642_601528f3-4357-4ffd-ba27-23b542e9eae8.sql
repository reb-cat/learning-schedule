-- Drop all staging tables and clean up staging-related database objects
DROP TABLE IF EXISTS assignments_staging CASCADE;
DROP TABLE IF EXISTS administrative_notifications_staging CASCADE;
DROP TABLE IF EXISTS learning_patterns_staging CASCADE;
DROP TABLE IF EXISTS student_energy_patterns_staging CASCADE;
DROP TABLE IF EXISTS sync_status_staging CASCADE;

-- Update any remaining assignments with proper defaults
UPDATE assignments 
SET 
  cognitive_load = COALESCE(cognitive_load, 'medium'),
  urgency = COALESCE(urgency, 'upcoming'),
  task_type = COALESCE(task_type, 'academic')
WHERE cognitive_load IS NULL OR urgency IS NULL OR task_type IS NULL;