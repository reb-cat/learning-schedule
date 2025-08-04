-- Update null cognitive_load values in assignments_staging with appropriate defaults
UPDATE assignments_staging 
SET cognitive_load = CASE 
  WHEN course_name ILIKE '%math%' OR course_name ILIKE '%algebra%' OR course_name ILIKE '%calculus%' THEN 'heavy'
  WHEN course_name ILIKE '%english%' OR course_name ILIKE '%literature%' OR course_name ILIKE '%writing%' THEN 'medium'
  WHEN course_name ILIKE '%history%' OR course_name ILIKE '%social%' OR course_name ILIKE '%science%' THEN 'medium'
  WHEN course_name ILIKE '%art%' OR course_name ILIKE '%music%' OR course_name ILIKE '%pe%' OR course_name ILIKE '%physical%' THEN 'light'
  WHEN title ILIKE '%quiz%' OR title ILIKE '%test%' OR title ILIKE '%exam%' THEN 'heavy'
  WHEN title ILIKE '%homework%' OR title ILIKE '%assignment%' THEN 'medium'
  WHEN title ILIKE '%reading%' OR title ILIKE '%review%' THEN 'light'
  WHEN estimated_time_minutes > 60 THEN 'heavy'
  WHEN estimated_time_minutes > 30 THEN 'medium'
  ELSE 'light'
END
WHERE cognitive_load IS NULL;