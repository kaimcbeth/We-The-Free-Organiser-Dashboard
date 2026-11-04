-- Birthdays (Kai, 5 Nov 2026): members can add their birthday (day and month,
-- no year) and organisers can add it on someone's profile. On the day, the
-- community gets an action to wish them happy birthday in the WhatsApp chat.

alter table people
  add column if not exists birth_month smallint check (birth_month between 1 and 12),
  add column if not exists birth_day smallint check (birth_day between 1 and 31);

-- Set or clear a birthday: the person themselves, or an organiser of their community.
create or replace function public.set_birthday(p_person_id uuid, p_month int, p_day int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person people;
begin
  select * into v_person from people where id = p_person_id;
  if v_person.id is null then return false; end if;
  if not (v_person.user_id = auth.uid() or private.is_team_organiser(v_person.team_id)) then
    return false;
  end if;
  if p_month is null or p_day is null then
    update people set birth_month = null, birth_day = null where id = p_person_id;
    return true;
  end if;
  if p_month not between 1 and 12 or p_day not between 1 and 31
     or p_day > extract(day from (make_date(2024, p_month, 1) + interval '1 month - 1 day')) then
    return false;
  end if;
  update people set birth_month = p_month, birth_day = p_day where id = p_person_id;
  return true;
end $$;

revoke all on function public.set_birthday(uuid, int, int) from public, anon;
grant execute on function public.set_birthday(uuid, int, int) to authenticated;

alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event', 'weekly', 'monthly', 'quarterly', 'newcomer', 'month_end', 'follow_up', 'special', 'weather', 'birthday']));

insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, core_role, default_enabled, late_ok)
values ('com_birthday', 'Birthday wished in the WhatsApp chat',
        'It''s their birthday today. Wish them a happy birthday in the community WhatsApp chat.',
        'Wish members happy birthday in the WhatsApp chat on their birthday.',
        2, 0, 53, 'end', 0, 'community', 'birthday', 'community_lead', true, false)
on conflict (kind) do nothing;

-- Hourly: from 7 am on someone's birthday (community time), one action per
-- person per year, due at the end of the day. Feb 29 birthdays fall on
-- Feb 28 in other years. Birthday actions left undone are tidied away 2 days later.
create or replace function private.create_birthday_tasks()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update tasks set dismissed_at = now()
   where kind = 'com_birthday' and done_at is null and dismissed_at is null
     and due_at < now() - interval '2 days';

  if (select k.archived_at from task_kinds k where k.kind = 'com_birthday') is not null then
    return 0;
  end if;

  with local as (
    select t.id team_id, coalesce(t.timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(t.timezone, 'Australia/Sydney')) lt
    from teams t
    left join team_task_kinds s on s.team_id = t.id and s.kind = 'com_birthday'
    where not t.is_example and not t.is_practice and coalesce(s.enabled, true)
  ), due as (
    select p.id person_id, p.first_name, l.team_id, l.tz, l.lt::date today,
           private.task_assignee(l.team_id, 'com_birthday', null, l.lt::date) assignee
    from people p
    join local l on l.team_id = p.team_id
    where not p.is_test
      and extract(hour from l.lt) >= 7
      and p.birth_month = extract(month from l.lt)
      and (p.birth_day = extract(day from l.lt)
           or (p.birth_month = 2 and p.birth_day = 29 and extract(day from l.lt) = 28
               and extract(day from (date_trunc('month', l.lt) + interval '1 month - 1 day')) = 28))
  ), made as (
    insert into tasks (team_id, kind, person_id, period, due_at, assigned_to)
    select team_id, 'com_birthday', person_id, 'bday-' || person_id || '-' || extract(year from today),
           ((today + 1)::timestamp at time zone tz) - interval '1 minute', assignee
    from due
    on conflict (team_id, kind, period) where period is not null do nothing
    returning id, team_id, person_id, assigned_to
  ), notified as (
    insert into notifications (user_id, kind, title, body, url, task_id)
    select coalesce(a.user_id, o.id), 'task', 'Birthday today: ' || p.first_name,
           'Wish ' || p.first_name || ' a happy birthday in the WhatsApp chat.',
           case when a.user_id is not null then '/me#tasks' else '/tasks' end, m.id
    from made m
    join people p on p.id = m.person_id
    left join people a on a.id = m.assigned_to
    left join organisers o on m.assigned_to is null
      and ((o.access = 'organiser' and o.team_id = m.team_id)
           or (o.access = 'god' and o.organiser_team_id = m.team_id))
    where coalesce(a.user_id, o.id) is not null
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $$;

select cron.schedule('birthday-tasks', '12 * * * *', $$select private.create_birthday_tasks()$$);
