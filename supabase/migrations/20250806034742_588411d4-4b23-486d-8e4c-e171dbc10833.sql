-- Clear all scheduled data for Abigail to remove stale data
UPDATE assignments 
SET scheduled_date = NULL, 
    scheduled_day = NULL, 
    scheduled_block = NULL,
    shared_block_id = NULL,
    block_position = NULL
WHERE student_name = 'Abigail';