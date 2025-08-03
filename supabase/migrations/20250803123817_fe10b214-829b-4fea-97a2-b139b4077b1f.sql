-- Fix the daily canvas sync cron job body parameter
SELECT cron.unschedule('daily-canvas-sync');

-- Recreate with properly formatted JSON body
SELECT
  cron.schedule(
    'daily-canvas-sync',
    '0 4 * * *',
    $$
    SELECT
      net.http_post(
          url:='https://yusqctrtoskjtahtibwh.supabase.co/functions/v1/daily-canvas-sync',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1c3FjdHJ0b3NranRhaHRpYndoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1NTk3MSwiZXhwIjoyMDY5NzMxOTcxfQ.JXs2jBk4-jmjXrYX_1Lx4l8lI-Ooq6Lde2HyZO7ZFAY"}'::jsonb,
          body:=jsonb_build_object('scheduledRun', true)
      ) as request_id;
    $$
  );