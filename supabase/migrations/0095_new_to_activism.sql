-- (Applied as new_to_activism.) "New to activism" tag: a newcomer who's never done activism before.
alter table people add column new_to_activism boolean not null default false;

-- Set from check-in (helper link token) or by the community's organisers / Core Team.
create function public.set_new_to_activism(p_person_id uuid, p_value boolean, p_token text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_event uuid; v_team uuid;
begin
  select team_id into v_team from people where id = p_person_id;
  if v_team is null then return false; end if;
  if p_token is not null then
    v_event := private.active_link_event(p_token);
    if v_event is null or not exists (select 1 from events where id = v_event and team_id = v_team) then return false; end if;
  elsif not private.is_team_core(v_team) then
    return false;
  end if;
  update people set new_to_activism = p_value where id = p_person_id;
  return true;
end $$;
grant execute on function public.set_new_to_activism(uuid, boolean, text) to anon, authenticated;

-- Volunteer feedback collected: about 10 minutes.
update task_kinds set estimate_minutes = 10, estimate_max_minutes = null where kind = 'com_feedback';
