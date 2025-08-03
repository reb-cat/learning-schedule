-- Create CRON job for daily auto-scheduler at 5 AM
-- This runs after the Canvas sync (which should be at 4 AM)
SELECT cron.schedule(
  'daily-auto-scheduler',
  '0 5 * * *', -- 5 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://yusqctrtoskjtahtibwh.supabase.co/functions/v1/auto-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1c3FjdHJ0b3NranRhaHRpYndoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1NTk3MSwiZXhwIjoyMDY5NzMxOTcxfQ.JXs2jBk4-jmjXrYX_1Lx4l8lI-Ooq6Lde2HyZO7ZFAY"}'::jsonb,
        body:='{"scheduledRun": true}'::jsonb
    ) as request_id;
  $$
);

-- Update Canvas sync to run at 4 AM (if it exists)
-- First, unschedule the existing Canvas sync if it exists
SELECT cron.unschedule('daily-canvas-sync');

-- Create new Canvas sync at 4 AM
SELECT cron.schedule(
  'daily-canvas-sync',
  '0 4 * * *', -- 4 AM every day  
  $$
  SELECT
    net.http_post(
        url:='https://yusqctrtoskjtahtibwh.supabase.co/functions/v1/daily-canvas-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1c3FjdHJ0b3NranRhaHRpYndoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1NTk3MSwiZXhwIjoyMDY5NzMxOTcxfQ.JXs2jBk4-jmjXrYX_1Lx4l8lI-Ooq6Lde2HyZO7ZFAY"}'::jsonb,
        body:='{"scheduledRun": true}'::jsonb
    ) as request_id;
  $$
);