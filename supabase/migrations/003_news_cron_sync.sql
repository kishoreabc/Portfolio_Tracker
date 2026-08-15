-- 1. Enable required extensions for HTTP requests and CRON scheduling
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the daily HTTP GET request to sync news
-- This job is named 'daily-news-sync' and runs every day at midnight UTC (0 0 * * *)
-- IMPORTANT: Replace <YOUR_APP_URL> with your actual deployed application URL
-- IMPORTANT: Replace <YOUR_CRON_SECRET> with the value of CRON_SECRET from your .env.local
SELECT cron.schedule(
  'daily-news-sync',
  '0 0 * * *',
  $$
  SELECT net.http_get(
    url := 'https://<YOUR_APP_URL>/api/news/sync/cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <YOUR_CRON_SECRET>'
    )
  );
  $$
);

/*
-- Useful commands for managing the cron job:

-- To view active scheduled jobs:
-- SELECT * FROM cron.job;

-- To view execution history/logs:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To unschedule / remove the job:
-- SELECT cron.unschedule('daily-news-sync');
*/
