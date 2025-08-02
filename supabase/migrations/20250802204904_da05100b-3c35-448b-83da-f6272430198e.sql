-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create assignments table
CREATE TABLE public.assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    title TEXT NOT NULL,
    course_name TEXT,
    subject TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    urgency TEXT CHECK (urgency IN ('overdue', 'due_today', 'due_soon', 'upcoming')),
    cognitive_load TEXT CHECK (cognitive_load IN ('light', 'medium', 'heavy')),
    estimated_time_minutes INTEGER,
    canvas_id TEXT,
    canvas_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for assignments (read-only for general access, edge functions can modify)
CREATE POLICY "Anyone can view assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Only service role can insert assignments" ON public.assignments FOR INSERT WITH CHECK (false);
CREATE POLICY "Only service role can update assignments" ON public.assignments FOR UPDATE USING (false);
CREATE POLICY "Only service role can delete assignments" ON public.assignments FOR DELETE USING (false);

-- Create sync_status table
CREATE TABLE public.sync_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
    message TEXT,
    assignments_count INTEGER DEFAULT 0,
    sync_type TEXT DEFAULT 'manual' CHECK (sync_type IN ('manual', 'scheduled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sync_status
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_status (read-only for general access, edge functions can modify)
CREATE POLICY "Anyone can view sync status" ON public.sync_status FOR SELECT USING (true);
CREATE POLICY "Only service role can insert sync status" ON public.sync_status FOR INSERT WITH CHECK (false);
CREATE POLICY "Only service role can update sync status" ON public.sync_status FOR UPDATE USING (false);
CREATE POLICY "Only service role can delete sync status" ON public.sync_status FOR DELETE USING (false);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_status_updated_at
    BEFORE UPDATE ON public.sync_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_assignments_student_name ON public.assignments(student_name);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX idx_assignments_urgency ON public.assignments(urgency);
CREATE INDEX idx_sync_status_student_name ON public.sync_status(student_name);
CREATE INDEX idx_sync_status_created_at ON public.sync_status(created_at DESC);

-- Insert initial sync status records
INSERT INTO public.sync_status (student_name, status, message, sync_type) VALUES
('Abigail', 'pending', 'Initial setup - no sync performed yet', 'manual'),
('Khalil', 'pending', 'Initial setup - no sync performed yet', 'manual');