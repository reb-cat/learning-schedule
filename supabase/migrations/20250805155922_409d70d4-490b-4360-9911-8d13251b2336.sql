-- Fix the manually created assignments that are missing due dates and time estimates
UPDATE assignments 
SET due_date = CURRENT_DATE + INTERVAL '1 day', 
    estimated_time_minutes = 120
WHERE student_name = 'Abigail' 
AND title = 'Complete and send Attendant packet to CDCN' 
AND due_date IS NULL;

UPDATE assignments 
SET due_date = CURRENT_DATE + INTERVAL '1 day', 
    estimated_time_minutes = 45
WHERE student_name = 'Abigail' 
AND title = 'Math Homework' 
AND due_date IS NULL;