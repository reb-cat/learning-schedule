-- Move "Capernaum" from assignments to all_day_events table
INSERT INTO all_day_events (
  student_name,
  event_title,
  event_date,
  event_type,
  description
)
SELECT 
  student_name,
  title,
  COALESCE(scheduled_date, due_date::date, CURRENT_DATE + INTERVAL '1 day'),
  'field_trip',
  COALESCE(notes, 'Field trip event')
FROM assignments 
WHERE title ILIKE '%capernaum%';

-- Delete the assignment from assignments table after moving to all_day_events
DELETE FROM assignments WHERE title ILIKE '%capernaum%';