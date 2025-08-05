-- Clean up any existing assignments with malformed IDs
-- First, store the original IDs before updating them
UPDATE assignments 
SET original_assignment_id = CASE 
    WHEN original_assignment_id IS NULL THEN id 
    ELSE original_assignment_id 
END
WHERE id::text LIKE '%_part_%';

-- Then update the malformed IDs with new UUIDs
UPDATE assignments 
SET id = gen_random_uuid()
WHERE id::text LIKE '%_part_%';

-- Also clean up any malformed parent_assignment_id references
UPDATE assignments 
SET parent_assignment_id = NULL
WHERE parent_assignment_id IS NOT NULL 
AND parent_assignment_id::text LIKE '%_part_%';

-- Clean up any malformed shared_block_id references  
UPDATE assignments 
SET shared_block_id = NULL
WHERE shared_block_id IS NOT NULL 
AND shared_block_id::text LIKE '%_part_%';