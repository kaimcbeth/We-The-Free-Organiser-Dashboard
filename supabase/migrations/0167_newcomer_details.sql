-- Check-in "Add someone new" extras (Kai, 4 Nov 2026): how they found us,
-- new to activism (existing), and the best way to reach them.

alter table public.people
  add column if not exists best_contact text
    check (best_contact in ('whatsapp', 'text', 'call', 'email', 'instagram', 'facebook')),
  add column if not exists contact_handle text;

grant update (best_contact, contact_handle) on public.people to authenticated;

-- Fills in what was given at check-in (blank = leave as is). Same access as
-- set_new_to_activism: a live check-in link for this community, or Core Team+.
create or replace function public.set_newcomer_details(
  p_person_id uuid,
  p_token text default null,
  p_found_via text default null,
  p_via_person uuid default null,
  p_note text default null,
  p_best_contact text default null,
  p_contact text default null
) returns boolean
language plpgsql security definer
set search_path = public
as $$
declare v_event uuid; v_team uuid; v_contact text := nullif(left(trim(coalesce(p_contact, '')), 200), '');
begin
  select team_id into v_team from people where id = p_person_id;
  if v_team is null then return false; end if;
  if p_token is not null then
    v_event := private.active_link_event(p_token);
    if v_event is null or not exists (select 1 from events where id = v_event and team_id = v_team) then return false; end if;
  elsif not private.is_team_core(v_team) then
    return false;
  end if;
  if p_via_person is not null and (p_via_person = p_person_id
     or not exists (select 1 from people where id = p_via_person and team_id = v_team)) then
    p_via_person := null;
  end if;
  if nullif(p_best_contact, '') is not null
     and p_best_contact not in ('whatsapp', 'text', 'call', 'email', 'instagram', 'facebook') then
    p_best_contact := null;
  end if;

  update people set
    found_via = coalesce(nullif(p_found_via, ''), found_via),
    found_via_person_id = case when nullif(p_found_via, '') is null then found_via_person_id
                               when p_found_via = 'person' then p_via_person end,
    found_via_note = case when nullif(p_found_via, '') is null then found_via_note
                          else nullif(left(trim(coalesce(p_note, '')), 100), '') end,
    started_on = coalesce(started_on, date_trunc('month', now())::date),
    best_contact = coalesce(nullif(p_best_contact, ''), best_contact),
    email = case when p_best_contact = 'email' and v_contact is not null then v_contact else email end,
    phone = case when p_best_contact in ('whatsapp', 'text', 'call') and v_contact is not null then v_contact else phone end,
    contact_handle = case when p_best_contact in ('instagram', 'facebook') and v_contact is not null then v_contact else contact_handle end
  where id = p_person_id;
  return true;
end $$;
revoke all on function public.set_newcomer_details(uuid, text, text, uuid, text, text, text) from public;
grant execute on function public.set_newcomer_details(uuid, text, text, uuid, text, text, text) to anon, authenticated;
