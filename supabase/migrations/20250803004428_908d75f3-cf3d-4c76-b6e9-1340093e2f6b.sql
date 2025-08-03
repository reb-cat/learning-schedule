-- Clean up fragmented and low-quality supply notifications
DELETE FROM administrative_notifications 
WHERE notification_type IN ('supplies', 'materials', 'forms')
  AND (
    title IN ('punches (to keep', 'binder with 6', 'Grammar', 'Writing', 'Literature', 'Graded, and', 'Baroness', 'Happenstand', 'Gary: Books')
    OR title LIKE '%: Books%'
    OR title LIKE 'Graded, and%'
    OR title LIKE 'punches (%'
    OR title LIKE 'binder with %'
    OR LENGTH(title) < 5
    OR title ~ '^[A-Z][a-z]+\s*$'  -- Single capitalized words
  );