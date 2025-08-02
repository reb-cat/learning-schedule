-- Add category column to assignments table to distinguish academic vs administrative tasks
ALTER TABLE assignments 
ADD COLUMN category text DEFAULT 'academic' CHECK (category IN ('academic', 'administrative'));

-- Add index for better performance when filtering by category
CREATE INDEX idx_assignments_category ON assignments(category);

-- Update existing assignments to have proper categories based on title keywords
UPDATE assignments 
SET category = 'administrative'
WHERE 
  title ILIKE '%fee%' OR 
  title ILIKE '%permission%' OR 
  title ILIKE '%form%' OR
  title ILIKE '%payment%' OR
  title ILIKE '%consent%' OR
  title ILIKE '%waiver%';