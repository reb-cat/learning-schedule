-- Drop the problematic function and trigger to reset everything
DROP TRIGGER IF EXISTS auto_classify_assignment_trigger ON assignments;
DROP TRIGGER IF EXISTS auto_classify_assignment_staging_trigger ON assignments_staging;
DROP FUNCTION IF EXISTS auto_classify_assignment();

-- Simple data update without triggers
UPDATE assignments 
SET 
  cognitive_load = CASE 
    WHEN title ILIKE '%syllabus%' OR title ILIKE '%recipe%' OR title ILIKE '%check%' OR title ILIKE '%review%' THEN 'light'
    WHEN title ILIKE '%project%' OR title ILIKE '%essay%' OR title ILIKE '%exam%' THEN 'heavy'
    ELSE 'medium'
  END,
  urgency = CASE 
    WHEN due_date IS NULL THEN 'upcoming'
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    WHEN due_date = CURRENT_DATE THEN 'due_today'
    WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
    ELSE 'upcoming'
  END
WHERE cognitive_load IS NULL OR urgency IS NULL;

UPDATE assignments_staging 
SET 
  cognitive_load = CASE 
    WHEN title ILIKE '%syllabus%' OR title ILIKE '%recipe%' OR title ILIKE '%check%' OR title ILIKE '%review%' THEN 'light'
    WHEN title ILIKE '%project%' OR title ILIKE '%essay%' OR title ILIKE '%exam%' THEN 'heavy'
    ELSE 'medium'
  END,
  urgency = CASE 
    WHEN due_date IS NULL THEN 'upcoming'
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    WHEN due_date = CURRENT_DATE THEN 'due_today'
    WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
    ELSE 'upcoming'
  END
WHERE cognitive_load IS NULL OR urgency IS NULL;