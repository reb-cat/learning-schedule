-- Update RLS policies to allow public INSERT and DELETE for administrative_notifications
DROP POLICY IF EXISTS "Only service role can insert administrative notifications" ON public.administrative_notifications;
DROP POLICY IF EXISTS "Only service role can delete administrative notifications" ON public.administrative_notifications;

-- Allow anyone to insert administrative notifications
CREATE POLICY "Anyone can insert administrative notifications" 
ON public.administrative_notifications 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to delete administrative notifications
CREATE POLICY "Anyone can delete administrative notifications" 
ON public.administrative_notifications 
FOR DELETE 
USING (true);