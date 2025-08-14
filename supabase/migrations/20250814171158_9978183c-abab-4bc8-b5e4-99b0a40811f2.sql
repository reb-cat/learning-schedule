-- Add UPDATE policies for assignments table to allow scheduling
CREATE POLICY "Anonymous users can update assignment scheduling fields" 
ON public.assignments 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Also allow authenticated users to update assignments  
CREATE POLICY "Authenticated users can update assignments" 
ON public.assignments 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');