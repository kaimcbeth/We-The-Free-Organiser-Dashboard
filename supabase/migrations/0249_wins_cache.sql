-- Find wins was slow (Kai, 19 Nov 2026: "This is taking too long"): results
-- are kept per country for 3 days (find-wins Edge Function), and every 15
-- minutes the cron warms up to 2 countries that have an open share-a-win
-- action in a community with an organiser who used the Hub in the last 30 days.
create table if not exists public.wins_cache (
  key text primary key,          -- 'team:<country>' or 'org:<country>'
  country text not null,
  result jsonb not null,
  found_at timestamptz not null default now()
);
alter table public.wins_cache enable row level security; -- service role only

create or replace function public.wins_warm_due()
returns table (country text, tz text)
language sql stable security definer set search_path = public as $$
  select c.country, min(c.tz)
  from (
    select private.team_country(tm.name) as country, tm.timezone as tz, t.created_at
    from tasks t
    join teams tm on tm.id = t.team_id
    where t.kind = 'com_share_win' and t.done_at is null and t.dismissed_at is null
      and not coalesce(tm.is_example, false) and not coalesce(tm.is_practice, false)
      and exists (
        select 1 from organisers o join page_views v on v.user_id = o.id
        where (o.team_id = tm.id or o.organiser_team_id = tm.id)
          and v.at > now() - interval '30 days')
  ) c
  left join wins_cache w on w.key = 'team:' || lower(c.country)
  where c.country <> '' and (w.found_at is null or w.found_at < now() - interval '3 days')
  group by c.country, w.found_at
  order by w.found_at nulls first
  limit 5;
$$;
revoke all on function public.wins_warm_due() from public, anon, authenticated;
grant execute on function public.wins_warm_due() to service_role;

select cron.schedule('find-wins-warm', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://jmslxbygvmjtwwxuzkrt.supabase.co/functions/v1/find-wins',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"warm": true}'::jsonb,
    timeout_milliseconds := 150000)
$$);
