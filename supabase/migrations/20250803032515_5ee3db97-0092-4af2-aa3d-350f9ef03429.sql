-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing Canvas sync cron job
SELECT cron.unschedule('daily-canvas-sync');

-- Remove any existing auto-scheduler cron job  
SELECT cron.unschedule('daily-auto-scheduler');

-- Schedule Canvas sync at 4 AM daily
SELECT cron.schedule(
  'daily-canvas-sync',
  '0 4 * * *', -- 4 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://yusqctrtoskjtahtibwh.supabase.co/functions/v1/daily-canvas-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1c3FjdHJ0b3NranRhaHRpYndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTU5NzEsImV4cCI6MjA2OTczMTk3MX0.fy6wBPoL24VdKKaG22IPlAe0-Zj8cKT1DcJa6yhtklc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Schedule auto-scheduler at 5 AM daily (after Canvas sync)
SELECT cron.schedule(
  'daily-auto-scheduler',
  '0 5 * * *', -- 5 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://yusqctrtoskjtahtibwh.supabase.co/functions/v1/auto-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1c3FjdHJ0b3NranRhaHRpYndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTU5NzEsImV4cCI6MjA2OTczMTk3MX0.fy6wBPoL24VdKKaG22IPlAe0-Zj8cKT1DcJa6yhtklc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);