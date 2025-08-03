-- Remove duplicate copy fee entries, keeping only the oldest one per student
WITH duplicate_fees AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY student_name, title, amount ORDER BY created_at ASC) as rn
  FROM administrative_notifications 
  WHERE notification_type = 'fee' 
    AND title ILIKE '%copy%'
)
DELETE FROM administrative_notifications 
WHERE id IN (
  SELECT id FROM duplicate_fees WHERE rn > 1
);