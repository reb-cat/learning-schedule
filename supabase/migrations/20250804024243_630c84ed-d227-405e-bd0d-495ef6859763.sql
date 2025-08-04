-- Step 1: Clean up database - Reset all scheduled blocks to allow proper rescheduling
UPDATE assignments_staging 
SET 
  scheduled_block = NULL,
  scheduled_date = NULL,
  scheduled_day = NULL
WHERE scheduled_block IS NOT NULL;

UPDATE assignments 
SET 
  scheduled_block = NULL,
  scheduled_date = NULL,
  scheduled_day = NULL
WHERE scheduled_block IS NOT NULL;

-- Step 2: Fix unrealistic time estimates (cap at 45 minutes)
UPDATE assignments_staging 
SET actual_estimated_minutes = LEAST(actual_estimated_minutes, 45)
WHERE actual_estimated_minutes > 45;

UPDATE assignments 
SET actual_estimated_minutes = LEAST(actual_estimated_minutes, 45)
WHERE actual_estimated_minutes > 45;

-- Step 3: Ensure proper task types are assigned for better classification
UPDATE assignments_staging 
SET task_type = classify_task_type(title, course_name)
WHERE task_type IS NULL OR task_type = '';

UPDATE assignments 
SET task_type = classify_task_type(title, course_name)
WHERE task_type IS NULL OR task_type = '';