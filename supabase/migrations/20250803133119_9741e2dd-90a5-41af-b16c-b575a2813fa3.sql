-- Update RLS policies for administrative_notifications to allow public updates
-- This will allow the frontend to edit administrative notifications

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Only service role can update administrative notifications" ON public.administrative_notifications;

-- Create a new policy that allows anyone to update administrative notifications
-- In a production app, you'd want to restrict this to authenticated users
CREATE POLICY "Anyone can update administrative notifications" 
ON public.administrative_notifications 
FOR UPDATE 
USING (true)
WITH CHECK (true);