-- Check for due buddy reminders every hour (at 5 past).
select cron.schedule(
  'buddy-reminders',
  '5 * * * *',
  $$ select net.http_post(
       url := 'https://jmslxbygvmjtwwxuzkrt.supabase.co/functions/v1/buddy-reminders',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
