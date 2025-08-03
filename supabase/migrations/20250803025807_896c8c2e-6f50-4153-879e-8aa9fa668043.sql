-- Add fields for multi-day scheduling and assignment splitting
ALTER TABLE public.assignments 
ADD COLUMN original_assignment_id UUID,
ADD COLUMN estimated_blocks_needed INTEGER DEFAULT 1,
ADD COLUMN scheduling_priority INTEGER DEFAULT 5,
ADD COLUMN is_split_assignment BOOLEAN DEFAULT FALSE,
ADD COLUMN split_part_number INTEGER DEFAULT 1,
ADD COLUMN total_split_parts INTEGER DEFAULT 1;

-- Add foreign key for original assignment relationship
ALTER TABLE public.assignments 
ADD CONSTRAINT fk_original_assignment 
FOREIGN KEY (original_assignment_id) REFERENCES public.assignments(id);

-- Create index for scheduling queries
CREATE INDEX idx_assignments_scheduling_priority ON public.assignments(scheduling_priority, due_date);
CREATE INDEX idx_assignments_original_id ON public.assignments(original_assignment_id);

-- Create function to calculate estimated blocks needed
CREATE OR REPLACE FUNCTION calculate_estimated_blocks(estimated_minutes INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Each block is typically 45 minutes
  IF estimated_minutes IS NULL THEN
    RETURN 1;
  END IF;
  
  RETURN GREATEST(1, CEIL(estimated_minutes::FLOAT / 45.0));
END;
$$ LANGUAGE plpgsql;

-- Update existing assignments with calculated blocks
UPDATE public.assignments 
SET estimated_blocks_needed = calculate_estimated_blocks(estimated_time_minutes)
WHERE estimated_time_minutes IS NOT NULL;