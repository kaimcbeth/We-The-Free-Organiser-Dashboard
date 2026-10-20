-- Tasks: follow-up jobs for a team, starting with "Post event photos" after
-- each event. Organisers see all their team's tasks and can assign one to a
-- person; the assigned person sees it on their own page.

create table task_kinds (
  kind              text primary key,
  title             text not null,
  description       text,
  estimate_minutes  int not null,
  due_after_hours   int not null
);

insert into task_kinds (kind, title, description, estimate_minutes, due_after_hours) values
  ('post_photos', 'Post event photos',
   'Share the best photos from the event with the team, e.g. in the WhatsApp community.', 5, 48);

alter table task_kinds enable row level security;
create policy "signed in reads task kinds" on task_kinds for select to authenticated using (true);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams (id) on delete cascade,
  event_id     uuid references events (id) on delete cascade,
  kind         text not null references task_kinds (kind),
  due_at       timestamptz not null,
  assigned_to  uuid references people (id) on delete set null,
  done_at      timestamptz,
  done_by      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (event_id, kind)
);

create index tasks_team_open_idx on tasks (team_id, due_at) where done_at is null;
create index tasks_assigned_idx on tasks (assigned_to) where done_at is null;

alter table tasks enable row level security;

create policy "organisers manage team tasks" on tasks
  for all to authenticated
  using (private.is_team_organiser(team_id))
  with check (private.is_team_organiser(team_id));

create policy "assignees read their tasks" on tasks
  for select to authenticated using (private.is_my_person(assigned_to));

-- Make tasks for events that have just finished (run every hour, and now).
create or replace function private.create_event_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  insert into tasks (team_id, event_id, kind, due_at)
  select e.team_id, e.id, k.kind,
         coalesce(e.ends_at, e.starts_at + interval '3 hours') + make_interval(hours => k.due_after_hours)
  from events e
  cross join task_kinds k
  where k.kind = 'post_photos'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now()
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '7 days'
  on conflict (event_id, kind) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select private.create_event_tasks();

select cron.schedule('event-tasks', '15 * * * *', $$ select private.create_event_tasks() $$);

-- The assigned person ticks their task off.
create or replace function public.complete_my_task(p_task_id uuid, p_done boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update tasks set
    done_at = case when p_done then coalesce(done_at, now()) else null end,
    done_by = case when p_done then auth.uid() else null end
  where id = p_task_id
    and (private.is_my_person(assigned_to) or private.is_team_organiser(team_id));
  return found;
end;
$$;

revoke execute on function public.complete_my_task(uuid, boolean) from public, anon;
grant execute on function public.complete_my_task(uuid, boolean) to authenticated;

-- Organisers assign a task to someone on the team (or unassign with null).
-- The person gets an in-app notification. (Applied as assign_task.)
create or replace function public.assign_task(p_task_id uuid, p_person_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_task tasks%rowtype;
  v_user uuid;
  v_title text;
  v_event text;
begin
  select * into v_task from tasks where id = p_task_id;
  if not found or not private.is_team_organiser(v_task.team_id) then return 'not_allowed'; end if;
  if p_person_id is not null then
    select user_id into v_user from people where id = p_person_id and team_id = v_task.team_id;
    if not found then return 'not_found'; end if;
  end if;
  update tasks set assigned_to = p_person_id where id = p_task_id;
  if v_user is not null and v_user <> auth.uid() and p_person_id is distinct from v_task.assigned_to then
    select k.title into v_title from task_kinds k where k.kind = v_task.kind;
    select e.title into v_event from events e where e.id = v_task.event_id;
    insert into notifications (user_id, kind, title, body, url)
    values (v_user, 'task', v_title || coalesce(': ' || v_event, ''), 'You''ve been given a task.', '/me#tasks');
  end if;
  return 'ok';
end;
$$;

revoke execute on function public.assign_task(uuid, uuid) from public, anon;
grant execute on function public.assign_task(uuid, uuid) to authenticated;

-- Renamed (passive: whoever posts them, the task just gets ticked off).
update task_kinds set title = 'Event photos posted',
  description = 'The best photos from the event are up for the team, e.g. in the WhatsApp community. Tick it off once they''re posted, whoever posted them.'
where kind = 'post_photos';
