-- First, properly migrate the Baking Supply Fee to administrative_notifications
INSERT INTO administrative_notifications (
  student_name,
  title,
  description,
  notification_type,
  priority,
  due_date,
  amount,
  canvas_id,
  canvas_url,
  course_name,
  completed
)
SELECT 
  student_name,
  title,
  'Course supply fee' as description,
  'fees' as notification_type,
  COALESCE(priority, 'medium') as priority,
  due_date,
  NULL as amount, -- Will be set by user
  canvas_id,
  canvas_url,
  course_name,
  false as completed
FROM assignments 
WHERE id = 'eea27945-d3e2-4a45-9b59-9b22fbc454bb'
  AND title = 'Baking Supply Fee' 
  AND student_name = 'Abigail';

-- Then delete the original assignment to prevent duplicates
DELETE FROM assignments 
WHERE id = 'eea27945-d3e2-4a45-9b59-9b22fbc454bb';