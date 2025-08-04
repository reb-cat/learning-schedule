-- Reset scheduling for testing
UPDATE assignments_staging 
SET scheduled_block = NULL, 
    scheduled_date = NULL, 
    scheduled_day = NULL,
    shared_block_id = NULL,
    block_position = NULL
WHERE student_name = 'Abigail';