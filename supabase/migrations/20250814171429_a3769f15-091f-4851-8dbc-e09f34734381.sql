-- Clear all scheduled assignments to fix constraint violations
UPDATE assignments 
SET scheduled_date = NULL, 
    scheduled_block = NULL, 
    scheduled_day = NULL, 
    shared_block_id = NULL, 
    block_position = NULL 
WHERE student_name = 'Abigail';