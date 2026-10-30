-- Special events as an event category: events.special_event_id says an event
-- is (say) the community's Christmas social. Organisers pick it on the event
-- page; imported events are tagged automatically when the title has the
-- special event's word (e.g. "Christmas") and it's within 3 weeks of the date.
-- Tagged events get "Special event promoted" every week from 8 weeks before.

alter table public.events add column if not exists special_event_id uuid
  references special_events(id) on delete set null;

-- The word(s) that identify a special event in a title ("Christmas social" ->
-- christmas; "Halloween Movie Challenge" -> halloween).
create or replace function private.special_event_words(p_name text)
returns text[] language sql immutable set search_path = public as $$
  select coalesce(array_agg(w), '{}') from regexp_split_to_table(lower(p_name), '[^a-z0-9]+') w
  where length(w) >= 4 and w not in ('movie', 'challenge', 'social', 'party', 'event', 'events',
                                     'night', 'dinner', 'picnic', 'with', 'your', 'the');
$$;

create or replace function private.guess_special_event(p_team_id uuid, p_title text, p_starts timestamptz)
returns uuid language sql stable security definer set search_path = public as $$
  select s.id from special_events s, teams t
  where t.id = p_team_id
    and (s.region_ids is null or t.region_id = any (s.region_ids))
    and abs((p_starts at time zone coalesce(t.timezone, 'Australia/Sydney'))::date
            - private.special_event_date(s, (p_starts at time zone coalesce(t.timezone, 'Australia/Sydney'))::date - 21)) <= 21
    and exists (select 1 from unnest(private.special_event_words(s.name)) w
                where lower(p_title) ~ ('\m' || w || '\M'))
  limit 1;
$$;

create or replace function private.tag_special_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.special_event_id is null then
    new.special_event_id := private.guess_special_event(new.team_id, new.title, new.starts_at);
  end if;
  return new;
end $$;
drop trigger if exists events_tag_special on public.events;
create trigger events_tag_special before insert on public.events
  for each row execute function private.tag_special_event();

-- Tag upcoming events already imported.
update events set special_event_id = private.guess_special_event(team_id, title, starts_at)
where special_event_id is null and starts_at > now();

insert into task_kinds (kind, title, description, estimate_minutes, due_after_hours, schedule,
                        sort_order, audience, default_enabled, core_role)
values ('promote_special', 'Special event promoted',
        'A big one, so promote it every week until the day: your WhatsApp community, Instagram and local Facebook groups.',
        10, 0, 'special', 2, 'community', true, 'promo_lead')
on conflict (kind) do update set title = excluded.title, description = excluded.description;

-- This week's promote action for each upcoming special event (8, 7, ... 1
-- week(s) before; weeks already gone are skipped). A new week's replaces
-- last week's if it wasn't ticked off.
create or replace function private.create_special_promo_tasks()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with slots as (
    select distinct on (e.id) e.id event_id, e.team_id, e.event_type_id, e.starts_at, w.n,
           e.starts_at - w.n * interval '7 days' show_from,
           (now() at time zone coalesce(t.timezone, 'Australia/Sydney'))::date today
    from events e
    join teams t on t.id = e.team_id
    cross join generate_series(1, 8) w(n)
    where e.special_event_id is not null and e.starts_at > now()
      and e.starts_at - w.n * interval '7 days' <= now()
      and not t.is_example and not t.is_practice
    order by e.id, w.n
  ), made as (
    insert into tasks (team_id, event_id, kind, period, show_from, due_at, assigned_to)
    select team_id, event_id, 'promote_special', 'special:' || event_id || ':w' || n, show_from,
           least(greatest(show_from + interval '6 days', now() + interval '1 day'), starts_at - interval '12 hours'),
           private.task_assignee(team_id, 'promote_special', event_type_id, today)
    from slots
    on conflict (team_id, kind, period) where period is not null do nothing
    returning id, event_id, assigned_to
  ), closed as (
    update tasks t set dismissed_at = now()
    from made m
    where t.event_id = m.event_id and t.kind = 'promote_special' and t.id <> m.id
      and t.done_at is null and t.dismissed_at is null
    returning 1
  ), notified as (
    insert into notifications (user_id, kind, title, body, url)
    select p.user_id, 'task', 'Special event promoted', 'A new action for you.', '/me#tasks'
    from made m join people p on p.id = m.assigned_to and p.user_id is not null
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $$;
revoke execute on function private.create_special_promo_tasks() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'special-promo-tasks';
select cron.schedule('special-promo-tasks', '47 * * * *', 'select private.create_special_promo_tasks()');
