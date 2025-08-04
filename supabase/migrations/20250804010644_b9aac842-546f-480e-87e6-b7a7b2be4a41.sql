-- Update RLS policies for staging tables to allow testing operations

-- Drop existing restrictive policies for assignments_staging
DROP POLICY IF EXISTS "Only service role can modify assignments staging" ON public.assignments_staging;

-- Create permissive policies for assignments_staging
CREATE POLICY "Anyone can insert assignments staging" 
ON public.assignments_staging 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update assignments staging" 
ON public.assignments_staging 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete assignments staging" 
ON public.assignments_staging 
FOR DELETE 
USING (true);

-- Drop existing restrictive policies for learning_patterns_staging
DROP POLICY IF EXISTS "Only service role can modify learning patterns staging" ON public.learning_patterns_staging;

-- Create permissive policies for learning_patterns_staging
CREATE POLICY "Anyone can insert learning patterns staging" 
ON public.learning_patterns_staging 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update learning patterns staging" 
ON public.learning_patterns_staging 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete learning patterns staging" 
ON public.learning_patterns_staging 
FOR DELETE 
USING (true);

-- Drop existing restrictive policies for student_energy_patterns_staging
DROP POLICY IF EXISTS "Only service role can modify energy patterns staging" ON public.student_energy_patterns_staging;

-- Create permissive policies for student_energy_patterns_staging
CREATE POLICY "Anyone can insert energy patterns staging" 
ON public.student_energy_patterns_staging 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update energy patterns staging" 
ON public.student_energy_patterns_staging 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete energy patterns staging" 
ON public.student_energy_patterns_staging 
FOR DELETE 
USING (true);

-- Drop existing restrictive policies for sync_status_staging
DROP POLICY IF EXISTS "Only service role can modify sync status staging" ON public.sync_status_staging;

-- Create permissive policies for sync_status_staging
CREATE POLICY "Anyone can insert sync status staging" 
ON public.sync_status_staging 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update sync status staging" 
ON public.sync_status_staging 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete sync status staging" 
ON public.sync_status_staging 
FOR DELETE 
USING (true);