-- Update missing cognitive_load and urgency for all assignments
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
  END
WHERE cognitive_load IS NULL OR urgency IS NULL;

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
  END
WHERE cognitive_load IS NULL OR urgency IS NULL;