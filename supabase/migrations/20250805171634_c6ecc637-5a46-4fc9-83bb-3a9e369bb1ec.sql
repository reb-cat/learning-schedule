-- Fix RLS policies for assignments table to allow frontend updates
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Only service role can update assignments" ON assignments;
DROP POLICY IF EXISTS "Only service role can insert assignments" ON assignments;
DROP POLICY IF EXISTS "Only service role can delete assignments" ON assignments;

-- Create new policies that allow frontend operations
CREATE POLICY "Anyone can insert assignments" 
ON assignments FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update assignments" 
ON assignments FOR UPDATE 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Anyone can delete assignments" 
ON assignments FOR DELETE 
USING (true);