-- (Applied as community_setup_checklist.) "Get <community> ready" checklist.
alter table teams add column setup_dismissed_at timestamptz;

create function public.team_setup_status(p_team_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when not private.is_team_core(p_team_id) then null else json_build_object(
    'whatsapp', (select whatsapp_url is not null from teams where id = p_team_id),
    'events', exists (select 1 from events where team_id = p_team_id and starts_at > now()),
    'actions', exists (select 1 from team_task_kinds where team_id = p_team_id),
    'core_team', exists (select 1 from organisers where team_id = p_team_id and access = 'core_team')
              or exists (select 1 from people where pending_role = 'core_team'
                         and coalesce(pending_team_id, team_id) = p_team_id),
    'dismissed', (select setup_dismissed_at is not null from teams where id = p_team_id)
  ) end;
$$;

create function public.set_team_whatsapp(p_team_id uuid, p_url text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then return false; end if;
  update teams set whatsapp_url = nullif(trim(p_url), '') where id = p_team_id;
  return true;
end $$;

create function public.dismiss_team_setup(p_team_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_organiser(p_team_id) then return false; end if;
  update teams set setup_dismissed_at = now() where id = p_team_id;
  return true;
end $$;
grant execute on function public.team_setup_status(uuid), public.set_team_whatsapp(uuid, text), public.dismiss_team_setup(uuid) to authenticated;
