-- Organiser welcome tour, and each community choosing which tasks are made
-- after every event (default: all of them, until an organiser chooses).
alter table organisers add column tutorial_done_at timestamptz;

create or replace function public.finish_organiser_tutorial()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update organisers set tutorial_done_at = coalesce(tutorial_done_at, now()) where id = auth.uid();
  return found;
end;
$$;
revoke execute on function public.finish_organiser_tutorial() from public, anon;
grant execute on function public.finish_organiser_tutorial() to authenticated;

create table team_task_kinds (
  team_id    uuid not null references teams (id) on delete cascade,
  kind       text not null references task_kinds (kind) on delete cascade,
  enabled    boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (team_id, kind)
);
alter table team_task_kinds enable row level security;
create policy "organisers read team task settings" on team_task_kinds
  for select to authenticated using (private.is_team_organiser(team_id));

create or replace function public.set_team_tasks(p_team_id uuid, p_kinds text[])
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then return false; end if;
  insert into team_task_kinds (team_id, kind, enabled, updated_by)
  select p_team_id, k.kind, k.kind = any(p_kinds), auth.uid() from task_kinds k
  on conflict (team_id, kind) do update
    set enabled = excluded.enabled, updated_at = now(), updated_by = excluded.updated_by;
  return true;
end;
$$;
revoke execute on function public.set_team_tasks(uuid, text[]) from public, anon;
grant execute on function public.set_team_tasks(uuid, text[]) to authenticated;

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
  left join team_task_kinds s on s.team_id = e.team_id and s.kind = k.kind
  where coalesce(s.enabled, true)
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now()
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '7 days'
  on conflict (event_id, kind) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
