-- "Plan later" on a suggested special event: hides the card and puts a
-- "Plan your <event>" action in the team's Actions from the chosen day.
-- Special events now come up 2 months before by default.
alter table task_kinds drop constraint if exists task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check
  check (schedule in ('event', 'weekly', 'monthly', 'quarterly', 'newcomer', 'month_end', 'follow_up', 'special'));

alter table special_event_responses drop constraint if exists special_event_responses_status_check;
alter table special_event_responses add constraint special_event_responses_status_check
  check (status in ('planning', 'hidden', 'later'));

alter table special_events alter column lead_days set default 61;
update special_events set lead_days = 61 where lead_days in (35, 42);

create or replace function public.plan_special_event_later(p_team_id uuid, p_event_id uuid, p_year int, p_show_from timestamptz)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_e special_events;
  v_tz text;
  v_on date;
  v_kind text := 'special_' || md5(p_team_id::text || p_event_id::text || p_year::text);
  v_due timestamptz;
begin
  if not private.is_team_organiser(p_team_id) then return 'not allowed'; end if;
  select * into v_e from special_events where id = p_event_id;
  if not found then return 'missing'; end if;
  select coalesce(timezone, 'Australia/Sydney') into v_tz from teams where id = p_team_id;
  v_on := private.special_event_date(v_e, make_date(p_year, 1, 1));
  -- Due a few days after it shows, and never after the day itself.
  v_due := least(p_show_from + interval '3 days', (v_on::timestamp + time '09:00') at time zone v_tz);
  insert into task_kinds (kind, title, description, estimate_minutes, due_after_hours, schedule, sort_order,
                          team_id, created_by, default_enabled)
  values (v_kind, left('Plan your ' || v_e.name, 80),
          concat_ws(' ', v_e.blurb, 'It''s on ' || to_char(v_on, 'FMDay FMDD Mon') || '. Create it on activism.wtf: https://mystats.wtf/events/new'),
          15, 72, 'special', 1, p_team_id, auth.uid(), false)
  on conflict (kind) do update set title = excluded.title, description = excluded.description;
  delete from tasks where team_id = p_team_id and kind = v_kind and done_at is null;
  insert into tasks (team_id, kind, show_from, due_at)
  values (p_team_id, v_kind, p_show_from, greatest(v_due, p_show_from));
  insert into special_event_responses (team_id, special_event_id, year, status)
  values (p_team_id, p_event_id, p_year, 'later')
  on conflict (team_id, special_event_id, year)
  do update set status = 'later', by_user = auth.uid(), at = now();
  return 'ok';
end $$;
revoke execute on function public.plan_special_event_later(uuid, uuid, int, timestamptz) from public, anon;
grant execute on function public.plan_special_event_later(uuid, uuid, int, timestamptz) to authenticated;

-- Cards stay hidden while a "Plan later" action is waiting.
create or replace function public.suggested_events(p_team_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_team teams;
  v_today date;
  v jsonb;
begin
  if not private.is_team_organiser(p_team_id) then return '[]'::jsonb; end if;
  select * into v_team from teams where id = p_team_id;
  if not v_team.suggest_events then return '[]'::jsonb; end if;
  v_today := (now() at time zone coalesce(v_team.timezone, 'Australia/Sydney'))::date;
  with s as (
    select e.*, private.special_event_date(e, v_today) as on_date
    from special_events e
    where e.region_ids is null or v_team.region_id = any (e.region_ids)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'emoji', s.emoji, 'blurb', s.blurb, 'link', s.link,
      'date', s.on_date, 'days', s.on_date - v_today, 'year', extract(year from s.on_date)::int,
      'planning', r.status = 'planning',
      'region', (select name from regions where id = v_team.region_id),
      'region_count', (select count(*) from special_event_responses x join teams t on t.id = x.team_id
                        where x.special_event_id = s.id and x.year = extract(year from s.on_date)
                          and x.status = 'planning' and t.region_id = v_team.region_id),
      'world_count', (select count(*) from special_event_responses x
                       where x.special_event_id = s.id and x.year = extract(year from s.on_date)
                         and x.status = 'planning')
    ) order by s.on_date), '[]'::jsonb) into v
  from s
  left join special_event_responses r on r.team_id = p_team_id
    and r.special_event_id = s.id and r.year = extract(year from s.on_date)
  where s.on_date is not null
    and v_today >= s.on_date - s.lead_days
    and coalesce(r.status, '') not in ('hidden', 'later');
  return v;
end $$;

-- An emoji for each special event (shown on the cards).
alter table special_events add column if not exists emoji text check (char_length(emoji) <= 16);
update special_events set emoji = '🎃' where name = 'Halloween Movie Challenge' and emoji is null;
update special_events set emoji = '🎄' where name = 'Christmas social' and emoji is null;
-- (suggested_events above also returns 'emoji', s.emoji after 'name'.)
