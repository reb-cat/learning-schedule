-- Set up daily cron job for Canvas sync
SELECT cron.schedule(
  'daily-canvas-sync',
  '0 5 * * *', -- 5:00 AM daily
  $$
  SELECT net.http_post(
    url := 'https://yusqctrtoskjtahtibwh.supabase.co/functions/v1/daily-canvas-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1c3FjdHJ0b3NranRhaHRpYndoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1NTk3MSwiZXhwIjoyMDY5NzMxOTcxfQ.WMZwjgkAF5MRN5GfQDVmKU2jJ5x8n5kCLhYG5mU3VzQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);