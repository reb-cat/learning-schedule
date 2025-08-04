-- Fix staging test data due dates to be within scheduling window (next 7 days)
UPDATE assignments_staging 
SET due_date = CASE 
  WHEN title LIKE '%Math%' THEN '2025-08-05 23:59:00+00'
  WHEN title LIKE '%Science%' THEN '2025-08-06 23:59:00+00'  
  WHEN title LIKE '%English%' THEN '2025-08-07 23:59:00+00'
  WHEN title LIKE '%History%' THEN '2025-08-08 23:59:00+00'
  WHEN title LIKE '%Forensics%' THEN '2025-08-09 23:59:00+00'
  WHEN title LIKE '%Baking%' THEN '2025-08-10 23:59:00+00'
  ELSE due_date
END
WHERE student_name = 'Abigail';