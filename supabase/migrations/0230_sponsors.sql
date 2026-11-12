-- NOT APPLIED YET (13 Nov 2026): apply_migration timed out waiting for Kai's
-- approval and nothing ran. Apply this whole file (execute_sql), then delete
-- this note. The Funding tab UI for sponsors is not built yet.
-- Sponsors list with thank-you reminders (Kai, 12 Nov 2026, idea 26).
-- Organisers keep a list of their community's sponsors (people or
-- businesses) on the Funding tab. An action "Sponsor thanked" comes up for
-- each new sponsor, then every 3 months for ongoing ones. Ticking it off
-- (or "Thanked today" on the list) records the thank-you.

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  kind text not null default 'person' check (kind in ('person', 'business')),
  contact text,
  amount numeric(10, 2) check (amount is null or amount >= 0),
  frequency text not null default 'monthly' check (frequency in ('once', 'monthly', 'yearly')),
  started_on date not null default current_date,
  ended_on date,
  last_thanked_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists sponsors_team_idx on public.sponsors(team_id);
alter table public.sponsors enable row level security;
drop policy if exists "organisers manage sponsors" on public.sponsors;
create policy "organisers manage sponsors" on public.sponsors
  for all to authenticated
  using (private.is_team_organiser(team_id))
  with check (private.is_team_organiser(team_id));

alter table public.tasks add column if not exists sponsor_id uuid references public.sponsors(id) on delete cascade;

alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'newcomer', 'month_end', 'follow_up', 'special',
  'weather', 'birthday', 'pod', 'season', 'region_weekly', 'region_fortnightly', 'region_monthly',
  'region_quarterly', 'reconnect', 'sponsor']));

insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, core_role, default_enabled, late_ok, tier, importance)
values ('com_sponsor_thanks', 'Sponsor thanked',
        'A short personal thank-you: a message, a photo from a recent event, or a shout-out in the community chat (ask them first). Tell them what their support made possible.',
        'Thank each sponsor when they start, then every 3 months while they keep giving.',
        5, 0, 55, 'end', 0, 'community', 'sponsor', 'community_lead', true, false, 2,
        (select coalesce(max(importance), 0) + 1 from task_kinds))
on conflict (kind) do nothing;

-- Ticking the action off records the thank-you.
create or replace function private.sponsor_thanked()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sponsor_id is not null and new.done_at is not null and old.done_at is null then
    update sponsors set last_thanked_at = new.done_at where id = new.sponsor_id;
  end if;
  return new;
end $$;
create or replace trigger tasks_sponsor_thanked
  after update of done_at on public.tasks
  for each row execute function private.sponsor_thanked();

-- Makes the actions: new sponsors never thanked (from a day after they're
-- added, so there's time to set things up), and ongoing ones (monthly/yearly,
-- not ended) not thanked for 90 days. One open per sponsor.
create or replace function private.create_sponsor_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update tasks set dismissed_at = now()
   where kind = 'com_sponsor_thanks' and done_at is null and dismissed_at is null
     and due_at < now() - interval '14 days';

  if (select k.archived_at from task_kinds k where k.kind = 'com_sponsor_thanks') is not null then
    return 0;
  end if;

  with due as (
    select s.id sponsor_id, s.team_id, s.name, s.amount, s.frequency,
           coalesce(t.timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(t.timezone, 'Australia/Sydney')) lt,
           s.last_thanked_at is null fresh
    from sponsors s
    join teams t on t.id = s.team_id
    left join team_task_kinds tk on tk.team_id = t.id and tk.kind = 'com_sponsor_thanks'
    where not t.is_example and not t.is_practice and coalesce(tk.enabled, true)
      and (s.ended_on is null or s.ended_on > current_date or s.last_thanked_at is null)
      and (
        (s.last_thanked_at is null and s.created_at < now() - interval '1 day')
        or (s.frequency <> 'once' and s.last_thanked_at < now() - interval '90 days')
      )
      and not exists (select 1 from tasks k where k.sponsor_id = s.id and k.done_at is null and k.dismissed_at is null)
  ), made as (
    insert into tasks (team_id, kind, sponsor_id, period, due_at, assigned_to, note)
    select d.team_id, 'com_sponsor_thanks', d.sponsor_id,
           'sponsor-' || d.sponsor_id || '-' || to_char(d.lt, 'YYYY-MM-DD'),
           ((d.lt::date + 7)::timestamp at time zone d.tz) - interval '1 minute',
           private.task_assignee(d.team_id, 'com_sponsor_thanks', null, d.lt::date),
           case when d.fresh then 'New sponsor: ' else 'Ongoing sponsor: ' end || d.name
             || coalesce(' ($' || trim(to_char(d.amount, 'FM999990.00')) || case d.frequency
                  when 'monthly' then ' a month' when 'yearly' then ' a year' else '' end || ')', '') || '.'
    from due d
    on conflict (team_id, kind, period) where period is not null do nothing
    returning id, team_id, assigned_to, note
  ), notified as (
    insert into notifications (user_id, kind, title, body, url, task_id)
    select coalesce(a.user_id, o.id), 'task', 'Thank a sponsor', m.note,
           case when a.user_id is not null then '/me#tasks' else '/tasks' end, m.id
    from made m
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

select cron.schedule('sponsor-tasks', '16 * * * *', $$select private.create_sponsor_tasks()$$);
