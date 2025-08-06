-- Fix the incorrect Capernaum event
DELETE FROM all_day_events WHERE id = '8676c997-9d1a-44f9-a3e6-36127b1fcefb';

-- Create the correct Capernaum volunteer event (8/7-8/11)
INSERT INTO all_day_events (student_name, event_title, event_type, event_date, start_date, end_date, event_group_id, description) 
VALUES 
  ('Abigail', 'Capernaum Volunteer Work', 'volunteer', '2025-08-07', '2025-08-07', '2025-08-11', 'fc123456-1234-5678-9abc-123456789abc', 'Volunteer work at Capernaum'),
  ('Abigail', 'Capernaum Volunteer Work', 'volunteer', '2025-08-08', '2025-08-07', '2025-08-11', 'fc123456-1234-5678-9abc-123456789abc', 'Volunteer work at Capernaum'),
  ('Abigail', 'Capernaum Volunteer Work', 'volunteer', '2025-08-09', '2025-08-07', '2025-08-11', 'fc123456-1234-5678-9abc-123456789abc', 'Volunteer work at Capernaum'),
  ('Abigail', 'Capernaum Volunteer Work', 'volunteer', '2025-08-10', '2025-08-07', '2025-08-11', 'fc123456-1234-5678-9abc-123456789abc', 'Volunteer work at Capernaum'),
  ('Abigail', 'Capernaum Volunteer Work', 'volunteer', '2025-08-11', '2025-08-07', '2025-08-11', 'fc123456-1234-5678-9abc-123456789abc', 'Volunteer work at Capernaum');