-- "Delegate every time": a standing delegate per community and kind of task.
alter table team_task_kinds add column delegate_to uuid references people (id) on delete set null;

create or replace function public.set_task_delegate(p_team_id uuid, p_kind text, p_person_id uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then return 'not_allowed'; end if;
  if p_person_id is not null and not exists (
    select 1 from people where id = p_person_id and team_id = p_team_id and user_id is not null
  ) then return 'not_found'; end if;
  insert into team_task_kinds (team_id, kind, enabled, delegate_to, updated_by)
  values (p_team_id, p_kind, true, p_person_id, auth.uid())
  on conflict (team_id, kind) do update
    set delegate_to = excluded.delegate_to, updated_at = now(), updated_by = excluded.updated_by;
  return 'ok';
end;
$$;
revoke execute on function public.set_task_delegate(uuid, text, uuid) from public, anon;
grant execute on function public.set_task_delegate(uuid, text, uuid) to authenticated;

-- New tasks go to the standing delegate (with a notification), if there is one.
create or replace function private.create_event_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with made as (
    insert into tasks (team_id, event_id, kind, due_at, assigned_to)
    select e.team_id, e.id, k.kind,
           coalesce(e.ends_at, e.starts_at + interval '3 hours') + make_interval(hours => k.due_after_hours),
           s.delegate_to
    from events e
    cross join task_kinds k
    left join team_task_kinds s on s.team_id = e.team_id and s.kind = k.kind
    where coalesce(s.enabled, true)
      and coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now()
      and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '7 days'
    on conflict (event_id, kind) do nothing
    returning id, kind, event_id, assigned_to
  ), notified as (
    insert into notifications (user_id, kind, title, body, url)
    select p.user_id, 'task', k.title || coalesce(': ' || e.title, ''), 'A new task for you.', '/me#tasks'
    from made m
    join people p on p.id = m.assigned_to and p.user_id is not null
    join task_kinds k on k.kind = m.kind
    left join events e on e.id = m.event_id
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end;
$$;
