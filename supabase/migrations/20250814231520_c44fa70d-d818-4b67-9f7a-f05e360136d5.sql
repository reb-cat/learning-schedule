-- Create Bible assignments for Khalil with allowed source value
INSERT INTO assignments (
  student_name, title, course_name, subject, assignment_type, category, task_type, source,
  estimated_time_minutes, estimated_blocks_needed, scheduling_priority, due_date, available_on,
  completion_status, progress_percentage, time_spent_minutes, notes, eligible_for_scheduling, is_fixed
) VALUES 
('Khalil', 'Genesis 1-2', 'Bible', 'Bible', 'academic', 'academic', 'academic', 'manual',
 25, 1, 3, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', 
 'not_started', 0, 0, 'Bible Reading #1: daily_reading', true, false),
('Khalil', 'Genesis 3-4', 'Bible', 'Bible', 'academic', 'academic', 'academic', 'manual',
 25, 1, 3, CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '2 days', 
 'not_started', 0, 0, 'Bible Reading #2: daily_reading', true, false),
('Khalil', 'Genesis 6-7', 'Bible', 'Bible', 'academic', 'academic', 'academic', 'manual',
 25, 1, 3, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', 
 'not_started', 0, 0, 'Bible Reading #3: daily_reading', true, false);

-- Create Bible assignments for Abigail with allowed source value  
INSERT INTO assignments (
  student_name, title, course_name, subject, assignment_type, category, task_type, source,
  estimated_time_minutes, estimated_blocks_needed, scheduling_priority, due_date, available_on,
  completion_status, progress_percentage, time_spent_minutes, notes, eligible_for_scheduling, is_fixed
) VALUES 
('Abigail', 'Genesis 1-2', 'Bible', 'Bible', 'academic', 'academic', 'academic', 'manual',
 25, 1, 3, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', 
 'not_started', 0, 0, 'Bible Reading #1: daily_reading', true, false),
('Abigail', 'Genesis 3-4', 'Bible', 'Bible', 'academic', 'academic', 'academic', 'manual',
 25, 1, 3, CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '2 days', 
 'not_started', 0, 0, 'Bible Reading #2: daily_reading', true, false),
('Abigail', 'Genesis 6-7', 'Bible', 'Bible', 'academic', 'academic', 'academic', 'manual',
 25, 1, 3, CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', 
 'not_started', 0, 0, 'Bible Reading #3: daily_reading', true, false);