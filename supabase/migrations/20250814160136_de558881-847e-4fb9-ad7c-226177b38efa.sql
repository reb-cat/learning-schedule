-- Phase 1: Safe RLS Implementation - Add policies for backend-only tables and frontend write access

-- Enable RLS on backend-only tables and add authenticated-only read policies
ALTER TABLE public.assignment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read assignment events" 
ON public.assignment_events 
FOR SELECT 
USING (auth.role() = 'authenticated');

ALTER TABLE public.learning_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read learning patterns" 
ON public.learning_patterns 
FOR SELECT 
USING (auth.role() = 'authenticated');

ALTER TABLE public.student_energy_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read student energy patterns" 
ON public.student_energy_patterns 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add anonymous read policy for sync_status (frontend-accessed table)
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anonymous users can read sync status" 
ON public.sync_status 
FOR SELECT 
USING (true);

-- Add anonymous INSERT policy for assignments to allow QuickAddForm.tsx to continue working
CREATE POLICY "Anonymous users can insert assignments" 
ON public.assignments 
FOR INSERT 
WITH CHECK (true);