-- God-only usage stats: one row per page visit by a signed-in person.
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  section text not null,
  path text not null,
  at timestamptz not null default now()
);
create index if not exists page_views_at on public.page_views (at);
alter table public.page_views enable row level security;
-- Nobody reads rows directly; visits are written through log_page_view and
-- read through usage_summary (God only).

create or replace function public.log_page_view(p_section text, p_path text)
returns void language sql security definer set search_path = public as $$
  insert into page_views (user_id, section, path)
  select auth.uid(), left(p_section, 60), left(p_path, 200)
  where auth.uid() is not null;
$$;
revoke execute on function public.log_page_view(text, text) from public, anon;
grant execute on function public.log_page_view(text, text) to authenticated;

-- Visits and distinct people per section over the last p_days days, split by
-- what the person is (God and test people left out), plus a daily total.
create or replace function public.usage_summary(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not private.is_god() then raise exception 'God only'; end if;
  with v as (
    select pv.section, pv.user_id, pv.at,
      coalesce(case o.access
        when 'regional_lead' then 'Regional Support Lead'
        when 'organiser' then 'Organiser'
        when 'core_team' then 'Core Team' end, 'Member') as who
    from page_views pv
    left join organisers o on o.id = pv.user_id
    where pv.at > now() - make_interval(days => p_days)
      and coalesce(o.access, '') <> 'god'
      and not exists (select 1 from people p where p.user_id = pv.user_id and p.is_test)
  )
  select jsonb_build_object(
    'sections', coalesce((select jsonb_agg(s order by s.views desc) from (
        select section, count(*) as views, count(distinct user_id) as people,
          jsonb_object_agg_strict(who, n) as by_who, max(at) as last_at
        from (select section, user_id, at, who,
                count(*) over (partition by section, who) as n from v) x
        group by section) s), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(d order by d.day) from (
        select (at at time zone 'Australia/Sydney')::date as day,
          count(*) as views, count(distinct user_id) as people
        from v group by 1) d), '[]'::jsonb),
    'people', (select count(distinct user_id) from v),
    'views', (select count(*) from v),
    'since', (select min(at) from page_views)
  ) into v;
  return v;
end $$;
revoke execute on function public.usage_summary(int) from public, anon;
grant execute on function public.usage_summary(int) to authenticated;
