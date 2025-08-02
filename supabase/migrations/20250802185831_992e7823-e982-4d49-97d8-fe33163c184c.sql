-- Create assignments table for storing Canvas assignments with scheduling info
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  urgency TEXT NOT NULL DEFAULT 'upcoming', -- 'overdue', 'due_today', 'upcoming'
  cognitive_load TEXT NOT NULL DEFAULT 'medium', -- 'light', 'medium', 'heavy'
  estimated_minutes INTEGER DEFAULT 30,
  scheduled_block INTEGER,
  scheduled_date DATE,
  scheduled_day TEXT,
  canvas_course_id TEXT,
  canvas_assignment_url TEXT,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for assignments (read-only for students, managed via edge functions)
CREATE POLICY "Students can view assignments" 
ON public.assignments 
FOR SELECT 
USING (true); -- Allow reading for now, will restrict by student when auth is added

CREATE POLICY "No direct assignment modifications" 
ON public.assignments 
FOR INSERT 
WITH CHECK (false); -- Only allow inserts through edge functions

CREATE POLICY "No direct assignment updates" 
ON public.assignments 
FOR UPDATE 
USING (false); -- Only allow updates through edge functions

CREATE POLICY "No direct assignment deletes" 
ON public.assignments 
FOR DELETE 
USING (false); -- Only allow deletes through edge functions

-- Create function to update timestamps
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_assignments_student_name ON public.assignments(student_name);
CREATE INDEX idx_assignments_status ON public.assignments(status);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX idx_assignments_urgency ON public.assignments(urgency);
CREATE INDEX idx_assignments_scheduled_date ON public.assignments(scheduled_date);
CREATE INDEX idx_assignments_canvas_id ON public.assignments(canvas_id);

-- Create table for tracking sync status
CREATE TABLE public.sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL UNIQUE,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sync_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'syncing', 'completed', 'error'
  sync_message TEXT,
  assignments_fetched INTEGER DEFAULT 0,
  assignments_scheduled INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for sync_status
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sync status" 
ON public.sync_status 
FOR SELECT 
USING (true);

CREATE POLICY "No direct sync status modifications" 
ON public.sync_status 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Create trigger for sync_status timestamps
CREATE TRIGGER update_sync_status_updated_at
  BEFORE UPDATE ON public.sync_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial sync status records
INSERT INTO public.sync_status (student_name, sync_status, sync_message) VALUES 
('Abigail', 'pending', 'Ready for first sync'),
('Khalil', 'pending', 'Ready for first sync');