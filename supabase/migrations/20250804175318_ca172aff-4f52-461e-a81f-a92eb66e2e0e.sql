-- CRITICAL: Fix malformed UUID data immediately
-- Step 1: Find and fix malformed IDs in assignments table
UPDATE assignments 
SET id = gen_random_uuid()
WHERE id::text LIKE '%_part_%';

-- Step 2: Fix malformed parent_assignment_id references
UPDATE assignments 
SET parent_assignment_id = NULL
WHERE parent_assignment_id::text LIKE '%_part_%';

-- Step 3: Fix malformed original_assignment_id references  
UPDATE assignments 
SET original_assignment_id = NULL
WHERE original_assignment_id::text LIKE '%_part_%';

-- Step 4: Fix malformed shared_block_id references
UPDATE assignments 
SET shared_block_id = NULL
WHERE shared_block_id::text LIKE '%_part_%';

-- Step 5: Do the same for staging table
UPDATE assignments_staging 
SET id = gen_random_uuid()
WHERE id::text LIKE '%_part_%';

UPDATE assignments_staging 
SET parent_assignment_id = NULL
WHERE parent_assignment_id::text LIKE '%_part_%';

UPDATE assignments_staging 
SET original_assignment_id = NULL
WHERE original_assignment_id::text LIKE '%_part_%';

UPDATE assignments_staging 
SET shared_block_id = NULL
WHERE shared_block_id::text LIKE '%_part_%';

-- Step 6: Add validation to prevent future malformed UUIDs
CREATE OR REPLACE FUNCTION validate_uuid_format()
RETURNS trigger AS $$
BEGIN
  -- Check if ID contains invalid characters for UUID
  IF NEW.id::text LIKE '%_part_%' THEN
    NEW.id = gen_random_uuid();
  END IF;
  
  -- Check parent_assignment_id
  IF NEW.parent_assignment_id IS NOT NULL AND NEW.parent_assignment_id::text LIKE '%_part_%' THEN
    NEW.parent_assignment_id = NULL;
  END IF;
  
  -- Check original_assignment_id
  IF NEW.original_assignment_id IS NOT NULL AND NEW.original_assignment_id::text LIKE '%_part_%' THEN
    NEW.original_assignment_id = NULL;
  END IF;
  
  -- Check shared_block_id
  IF NEW.shared_block_id IS NOT NULL AND NEW.shared_block_id::text LIKE '%_part_%' THEN
    NEW.shared_block_id = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add validation triggers
CREATE TRIGGER validate_assignments_uuid
  BEFORE INSERT OR UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION validate_uuid_format();

CREATE TRIGGER validate_assignments_staging_uuid
  BEFORE INSERT OR UPDATE ON assignments_staging
  FOR EACH ROW
  EXECUTE FUNCTION validate_uuid_format();