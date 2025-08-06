-- Add support for multi-day events by adding date range and event grouping
ALTER TABLE public.all_day_events 
ADD COLUMN start_date date,
ADD COLUMN end_date date,
ADD COLUMN event_group_id uuid DEFAULT gen_random_uuid();

-- Set start_date and end_date to event_date for existing records
UPDATE public.all_day_events 
SET start_date = event_date, 
    end_date = event_date 
WHERE start_date IS NULL;

-- Create index for better performance on date range queries
CREATE INDEX idx_all_day_events_date_range ON public.all_day_events(student_name, start_date, end_date);
CREATE INDEX idx_all_day_events_group ON public.all_day_events(event_group_id);