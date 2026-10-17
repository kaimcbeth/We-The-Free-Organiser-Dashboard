-- The attendance and events access rules referred to each other in a loop
-- (infinite recursion), so any query loading check-ins failed. These helpers
-- answer the same questions without going back through the access rules.

create or replace function private.event_team(p_event_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from events where id = p_event_id;
$$;

create or replace function private.is_my_person(p_person_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = p_person_id and user_id = auth.uid());
$$;

create or replace function private.i_attended(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from attendance a join people p on p.id = a.person_id
    where a.event_id = p_event_id and p.user_id = auth.uid()
  );
$$;

revoke execute on function private.event_team(uuid), private.is_my_person(uuid), private.i_attended(uuid) from public, anon;
grant execute on function private.event_team(uuid), private.is_my_person(uuid), private.i_attended(uuid) to authenticated;

alter policy "organisers manage team attendance" on attendance
  using (private.is_team_organiser(private.event_team(event_id)))
  with check (private.is_team_organiser(private.event_team(event_id)));

alter policy "attendees read own attendance" on attendance
  using (private.is_my_person(person_id));

alter policy "attendees read attended events" on events
  using (private.i_attended(id));
