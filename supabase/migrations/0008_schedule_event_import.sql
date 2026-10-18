-- Run the import-events Edge Function twice a day:
-- 6am and 2pm Sydney time (AEDT = UTC+11; during winter AEST these land at 5am and 1pm).
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'import-activism-events',
  '0 19,3 * * *',
  $$ select net.http_post(
       url := 'https://jmslxbygvmjtwwxuzkrt.supabase.co/functions/v1/import-events',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
