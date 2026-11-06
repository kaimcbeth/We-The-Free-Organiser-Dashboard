-- Kai, 6 Nov 2026: regional social media posts: "What's on" across the
-- region every fortnight, a monthly community spotlight, and regional
-- milestones when they happen.

-- 1. Region-wide fortnightly schedule (fortnights from Mon 16 Nov 2026, like
--    the community 'fortnightly' one; due the Sunday that ends the fortnight).
alter table task_kinds drop constraint if exists task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event','weekly','fortnightly','monthly','quarterly','newcomer','month_end','follow_up','special',
  'weather','birthday','pod','season','region_weekly','region_fortnightly','region_monthly','region_quarterly']));

-- A line about this one action (milestones say what happened).
alter table tasks add column if not exists note text;

do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_region_tasks()'::regprocedure);
  d := replace(d, $q$when 'region_weekly' then to_char(d.today, 'IYYY-"W"IW')$q$,
    $q$when 'region_weekly' then to_char(d.today, 'IYYY-"W"IW')
             when 'region_fortnightly' then 'F' || floor((d.today - date '2026-11-16') / 14.0)::int$q$);
  d := replace(d, $q$             when 'region_quarterly' then
               greatest(((date_trunc('quarter', d.today)::date + 30)::timestamp$q$,
    $q$             when 'region_fortnightly' then
               greatest(((date '2026-11-16' + floor((d.today - date '2026-11-16') / 14.0)::int * 14 + 13)::timestamp
                         + interval '23 hours 59 minutes') at time zone d.tz, now() + interval '1 day')
             when 'region_quarterly' then
               greatest(((date_trunc('quarter', d.today)::date + 30)::timestamp$q$);
  d := replace(d, $q$k.schedule in ('region_weekly', 'region_monthly', 'region_quarterly')$q$,
                  $q$k.schedule in ('region_weekly', 'region_fortnightly', 'region_monthly', 'region_quarterly')$q$);
  if d not like '%region_fortnightly%region_fortnightly%region_fortnightly%' then
    raise exception 'create_region_tasks patch failed';
  end if;
  execute d;

  d := pg_get_functiondef('private.create_monthly_tasks()'::regprocedure);
  d := replace(d, $q$k.schedule not in ('special', 'region_weekly', 'region_monthly', 'quarterly', 'region_quarterly')$q$,
                  $q$k.schedule not in ('special', 'region_weekly', 'region_fortnightly', 'region_monthly', 'quarterly', 'region_quarterly')$q$);
  if d not like '%region_fortnightly%' then raise exception 'create_monthly_tasks patch failed'; end if;
  execute d;
end $$;

-- 2. The three kinds.
insert into task_kinds (kind, title, blurb, description, estimate_minutes, estimate_max_minutes,
                        anchor, appear_hours, due_after_hours, sort_order, audience, schedule, default_enabled)
values
 ('rsl_social_whats_on', 'What''s on across the region posted',
  'Every community''s events for the next two weeks, in one post',
  'Post what''s on across your region for the next two weeks, so people can find an event near them. "Make the post" has every community''s events as an image and as text.',
  15, 20, 'start', 0, 0, 37, 'regional', 'region_fortnightly', true),
 ('rsl_social_spotlight', 'Community spotlight posted',
  'One community a month on the regional pages',
  'Shine a light on one community: who they are, what they do and how to join. Take turns so every community gets a go, and borrow a good photo from them. "Pick a community" suggests one and writes a caption.',
  20, 30, 'start', 0, 0, 38, 'regional', 'region_monthly', true),
 ('rsl_social_milestone', 'Regional milestone posted',
  'Something worth celebrating across the region',
  'Celebrate it on the regional pages and tag the communities involved.',
  15, null, 'start', 0, 0, 39, 'regional', 'special', true)
on conflict (kind) do nothing;
update task_kinds set sort_order = 40 where kind = 'rsl_main_repost';

-- 3. Events across a region's patch (incl. extra countries), for "What's on".
create or replace function public.region_upcoming_events(p_region uuid, p_from date, p_days int default 14)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when private.can_plan_region(p_region) then coalesce(jsonb_agg(jsonb_build_object(
      'team', t.name, 'tz', t.timezone, 'title', e.title, 'starts_at', e.starts_at,
      'venue', e.venue, 'address', e.address, 'time_unknown', coalesce(e.time_unknown, false))
      order by e.starts_at), '[]'::jsonb) end
  from events e join teams t on t.id = e.team_id
  where private.team_in_region(t.id, p_region)
    and not coalesce(t.is_example, false) and not coalesce(t.is_practice, false)
    and (e.starts_at at time zone coalesce(t.timezone, 'UTC'))::date >= p_from
    and (e.starts_at at time zone coalesce(t.timezone, 'UTC'))::date < p_from + p_days;
$$;

-- 4. Communities for the spotlight: how they've been going lately.
create or replace function public.region_spotlight(p_region uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when private.can_plan_region(p_region) then coalesce(jsonb_agg(x order by x.name), '[]'::jsonb) end
  from (
    select t.name, t.activism_team_url url, t.instagram_handle handle, t.founded_on,
      (select count(*) from events e where e.team_id = t.id
         and e.starts_at between now() - interval '90 days' and now()) events_90,
      (select count(*) from attendance a join events e on e.id = a.event_id
         where e.team_id = t.id and e.starts_at between now() - interval '90 days' and now()) people_90,
      (select min(e.starts_at) from events e where e.team_id = t.id and e.starts_at > now()) next_at,
      (select e.title from events e where e.team_id = t.id and e.starts_at > now()
         order by e.starts_at limit 1) next_title,
      (select count(*) from film_survey_responses f where f.team_id = t.id) watched
    from teams t
    where private.team_in_region(t.id, p_region)
      and not coalesce(t.is_example, false) and not coalesce(t.is_practice, false)
  ) x;
$$;

-- 5. Milestones: a new community, a community anniversary coming up, and
--    round numbers across the region (only the highest one reached is made,
--    so the first run doesn't celebrate every old number at once).
create or replace function private.create_region_milestone_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int := 0; r record; m record; v_id uuid;
  v_steps int[] := array[50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
begin
  if not coalesce((select default_enabled from task_kinds where kind = 'rsl_social_milestone'
                    and archived_at is null), false) then return 0; end if;
  for r in
    select g.id
    from regions g
    where exists (select 1 from teams t where t.region_id = g.id)
      and coalesce((select rk.enabled from region_task_kinds rk
                    where rk.region_id = g.id and rk.kind = 'rsl_social_milestone'), true)
  loop
    for m in
      -- New community in the last 14 days.
      select 'new:' || t.id period, 'New community: We The Free ' || split_part(t.name, ',', 1)
             || ' has just started. Welcome them on the regional pages.' note,
             now() + interval '5 days' due
      from teams t
      where private.team_in_region(t.id, r.id) and t.created_at > now() - interval '14 days'
        and not coalesce(t.is_example, false) and not coalesce(t.is_practice, false)
      union all
      -- Anniversary in the next 7 days (founded_on set).
      select 'anniv:' || t.id || ':' || extract(year from now())::int,
             'We The Free ' || split_part(t.name, ',', 1) || ' turns '
             || (extract(year from now())::int - extract(year from t.founded_on)::int) || ' on '
             || to_char(make_date(extract(year from now())::int, extract(month from t.founded_on)::int,
                        least(extract(day from t.founded_on)::int, 28)), 'FMDD FMMonth') || '.',
             make_date(extract(year from now())::int, extract(month from t.founded_on)::int,
                       least(extract(day from t.founded_on)::int, 28))::timestamp + interval '23 hours 59 minutes'
      from teams t
      where private.team_in_region(t.id, r.id) and t.founded_on is not null
        and extract(year from now())::int > extract(year from t.founded_on)::int
        and make_date(extract(year from now())::int, extract(month from t.founded_on)::int,
                      least(extract(day from t.founded_on)::int, 28))
            between current_date and current_date + 7
      union all
      -- Round numbers: check-ins, events held, films watched.
      select x.key || ':' || s, replace(x.line, '{n}', to_char(s, 'FM999,999')), now() + interval '5 days'
      from (
        select 'people' key, 'Across the region, people have now checked in at events more than {n} times.' line,
               (select count(*) from attendance a join events e on e.id = a.event_id
                 where private.team_in_region(e.team_id, r.id)) n
        union all
        select 'events', 'Communities across the region have now held more than {n} events.',
               (select count(*) from events e where private.team_in_region(e.team_id, r.id)
                  and e.starts_at < now()
                  -- Facebook history (manual, untyped) includes other groups' events.
                  and (e.source is distinct from 'manual' or e.event_type_id is not null))
        union all
        select 'films', 'People across the region have now watched a Movie Challenge film more than {n} times.',
               (select count(*) from film_survey_responses f where private.team_in_region(f.team_id, r.id))
      ) x
      cross join lateral (select max(st) s from unnest(v_steps) st where st < x.n) top
      where top.s is not null
    loop
      insert into tasks (region_id, kind, period, due_at, note)
      values (r.id, 'rsl_social_milestone', m.period, m.due, m.note)
      on conflict (region_id, kind, period) where region_id is not null and period is not null do nothing
      returning id into v_id;
      if v_id is not null then
        v_count := v_count + 1;
        insert into notifications (user_id, kind, title, body, url, task_id)
        select o.id, 'task', 'Regional milestone', m.note, '/tasks', v_id
        from organisers o
        where (o.access = 'regional_lead' and o.region_id = r.id)
           or (o.access = 'god' and o.lead_region_id = r.id);
        v_id := null;
      end if;
    end loop;
  end loop;
  return v_count;
end $$;

select cron.schedule('region-milestones', '33 * * * *', $$select private.create_region_milestone_tasks()$$);
select private.create_region_tasks();
