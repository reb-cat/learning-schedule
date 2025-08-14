-- Fix RLS policies for assignments table to resolve conflicts
-- Remove conflicting policies and create clean ones

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "anon_read_assignments_temp" ON assignments;
DROP POLICY IF EXISTS "auth_read_assignments" ON assignments;
DROP POLICY IF EXISTS "Anonymous users can insert assignments" ON assignments;
DROP POLICY IF EXISTS "Anonymous users can update assignment scheduling fields" ON assignments;
DROP POLICY IF EXISTS "Authenticated users can update assignments" ON assignments;

-- Create simplified, non-conflicting policies
-- Allow reading assignments for everyone (needed for the dashboard)
CREATE POLICY "Allow read access to assignments" 
ON assignments FOR SELECT 
USING (true);

-- Allow inserting assignments (needed for Canvas sync and manual creation)
CREATE POLICY "Allow insert assignments" 
ON assignments FOR INSERT 
WITH CHECK (true);

-- Allow updating assignments for completion and scheduling
CREATE POLICY "Allow update assignments" 
ON assignments FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Clear any existing Bible assignments to avoid duplicates
DELETE FROM assignments 
WHERE title ILIKE '%bible%' 
   OR title ILIKE '%reading%' 
   OR course_name = 'Bible';