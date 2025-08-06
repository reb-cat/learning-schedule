-- Mark original as complete if Part 3/3 is complete
UPDATE assignments 
SET completion_status = 'completed'
WHERE title = 'Complete and send Attendant packet to CDCN'
AND split_part_number IS NULL;

-- Delete the duplicate parts
DELETE FROM assignments
WHERE title LIKE '%Part%/3%';