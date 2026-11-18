-- Fix a name from the check-in list (Kai, 19 Nov 2026: "I spelt this
-- person's name wrong"). Core Team and up, people in the event's community.
create or replace function public.core_rename_person(p_event_id uuid, p_person_id uuid, p_first text, p_last text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_core(private.event_team(p_event_id)) or coalesce(trim(p_first), '') = '' then
    return false;
  end if;
  update people p set first_name = trim(p_first), last_name = nullif(trim(p_last), '')
  from events e
  where e.id = p_event_id and p.id = p_person_id
    and (p.team_id = e.team_id or p.pending_team_id = e.team_id
         or exists (select 1 from attendance a where a.event_id = e.id and a.person_id = p.id));
  return found;
end;
$$;

revoke execute on function public.core_rename_person(uuid, uuid, text, text) from public, anon;
grant execute on function public.core_rename_person(uuid, uuid, text, text) to authenticated;
