-- Clean up all dependent triggers first
DROP TRIGGER IF EXISTS auto_classify_assignment_trigger ON assignments CASCADE;
DROP TRIGGER IF EXISTS auto_classify_assignment_staging_trigger ON assignments_staging CASCADE;
DROP TRIGGER IF EXISTS auto_classify_staging_assignment ON assignments_staging CASCADE;
DROP TRIGGER IF EXISTS assignments_staging_auto_classify ON assignments_staging CASCADE;

-- Now drop the function with cascade
DROP FUNCTION IF EXISTS auto_classify_assignment() CASCADE;

-- Simple direct data update
UPDATE assignments 
SET 
  cognitive_load = 'medium',
  urgency = 'upcoming'
WHERE cognitive_load IS NULL OR urgency IS NULL;

UPDATE assignments_staging 
SET 
  cognitive_load = 'medium', 
  urgency = 'upcoming'
WHERE cognitive_load IS NULL OR urgency IS NULL;