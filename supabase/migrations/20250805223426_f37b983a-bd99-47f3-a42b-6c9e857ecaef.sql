-- Reschedule past assignments to today for testing
UPDATE assignments 
SET 
  scheduled_date = '2025-08-05',
  scheduled_day = 'Tuesday',
  updated_at = now()
WHERE 
  student_name = 'Abigail' 
  AND scheduled_date = '2025-08-04' 
  AND completion_status = 'not_started'
  AND scheduled_block IS NOT NULL;