-- Create a table for all-day events that can override normal scheduling
CREATE TABLE IF NOT EXISTS public.all_day_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'field_trip',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.all_day_events ENABLE ROW LEVEL SECURITY;

-- Create policies for all-day events
CREATE POLICY "Anyone can view all-day events" 
ON public.all_day_events 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create all-day events" 
ON public.all_day_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update all-day events" 
ON public.all_day_events 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete all-day events" 
ON public.all_day_events 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_all_day_events_updated_at
BEFORE UPDATE ON public.all_day_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();