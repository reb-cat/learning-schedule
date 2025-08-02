-- Create administrative_notifications table for parent action items
CREATE TABLE public.administrative_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  notification_type TEXT NOT NULL DEFAULT 'general', -- 'fee', 'form', 'permission', 'general'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
  due_date TIMESTAMP WITH TIME ZONE,
  amount DECIMAL(10,2), -- for fees
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  canvas_id TEXT,
  canvas_url TEXT,
  course_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.administrative_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for administrative notifications
CREATE POLICY "Anyone can view administrative notifications" 
ON public.administrative_notifications 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can insert administrative notifications" 
ON public.administrative_notifications 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Only service role can update administrative notifications" 
ON public.administrative_notifications 
FOR UPDATE 
USING (false);

CREATE POLICY "Only service role can delete administrative notifications" 
ON public.administrative_notifications 
FOR DELETE 
USING (false);

-- Add eligible_for_scheduling column to assignments table
ALTER TABLE public.assignments 
ADD COLUMN eligible_for_scheduling BOOLEAN NOT NULL DEFAULT true;

-- Add academic_year column to assignments table
ALTER TABLE public.assignments 
ADD COLUMN academic_year TEXT;

-- Create trigger for automatic timestamp updates on administrative_notifications
CREATE TRIGGER update_administrative_notifications_updated_at
BEFORE UPDATE ON public.administrative_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_administrative_notifications_student_name ON public.administrative_notifications(student_name);
CREATE INDEX idx_administrative_notifications_due_date ON public.administrative_notifications(due_date);
CREATE INDEX idx_administrative_notifications_priority ON public.administrative_notifications(priority);
CREATE INDEX idx_assignments_eligible_scheduling ON public.assignments(eligible_for_scheduling);
CREATE INDEX idx_assignments_academic_year ON public.assignments(academic_year);