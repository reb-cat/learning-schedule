-- Manually migrate the Baking Supply Fee to administrative_notifications
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
  'Migrated from assignments table' as description,
  'fees' as notification_type,
  COALESCE(priority, 'medium') as priority,
  due_date,
  NULL as amount, -- Will be set by user
  canvas_id,
  canvas_url,
  course_name,
  false as completed
FROM assignments 
WHERE title = 'Baking Supply Fee' 
  AND student_name = 'Abigail'
  AND category = 'administrative';