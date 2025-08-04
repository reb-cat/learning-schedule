-- Clean up duplicate assignments, keeping only the first one of each title
WITH ranked_assignments AS (
  SELECT id, title, ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at) as rn
  FROM assignments_staging
)
DELETE FROM assignments_staging 
WHERE id IN (
  SELECT id FROM ranked_assignments WHERE rn > 1
);